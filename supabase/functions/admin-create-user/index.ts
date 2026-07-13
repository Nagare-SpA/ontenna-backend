import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Admin-only: create a confirmed Ontenna user and (optionally) grant a free
// subscription for N months. Mirrors the auth/role checks of delete-user.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) return json({ error: "Invalid token" }, 401);

    // 2) Require super_admin
    const { data: roleData } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("role", "super_admin").maybeSingle();
    if (!roleData) return json({ error: "Unauthorized: Super admin access required" }, 403);

    // 3) Validate input
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const firstName = (body.first_name || "").trim();
    const lastName = (body.last_name || "").trim();
    const freeMonths = Number.isFinite(body.free_months) ? Number(body.free_months) : 0;
    const planId = body.plan_id || null;
    const adminNotes = (body.admin_notes || "").trim() || null;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, code: "invalid_email", message: "A valid email is required." }, 400);
    if (typeof password !== "string" || password.length < 8) return json({ ok: false, code: "weak_password", message: "Password must be at least 8 characters." }, 400);
    if (!firstName) return json({ ok: false, code: "invalid_request", message: "First name is required." }, 400);

    // 4) Create the user, already confirmed (admin-created accounts skip email verification).
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, account_type: "end_user" },
    });

    if (error) {
      const msg = error.message || "";
      if (/already.*registered|already.*exists|already been registered/i.test(msg)) return json({ ok: false, code: "already_exists", message: "This email already has an account." }, 409);
      if (/password/i.test(msg) || /pwned|weak/i.test(msg)) return json({ ok: false, code: "weak_password", message: msg || "Password is too weak." }, 400);
      return json({ ok: false, code: "create_failed", message: msg }, 400);
    }

    const userId = data.user?.id;
    if (!userId) return json({ ok: false, code: "create_failed", message: "Could not create account" }, 500);

    // Admin-created accounts are confirmed — keep the profile flag consistent so
    // the mobile app (which checks it) lets them in.
    await supabase.from("profiles")
      .update({ is_verified: true, verification_status: "verified" })
      .eq("id", userId);

    // 5) Optional: grant a free subscription for N months.
    let grantedUntil: string | null = null;
    if (freeMonths > 0 && planId) {
      const now = new Date();
      const until = new Date(now);
      until.setMonth(until.getMonth() + freeMonths);
      grantedUntil = until.toISOString();

      const { error: subErr } = await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: grantedUntil,
        free_until: grantedUntil,
        cancel_at_period_end: false,
        granted_by: caller.id,
        admin_notes: adminNotes ?? `Free ${freeMonths} month(s) granted on create`,
      });
      if (subErr) {
        // Account exists; report the partial result so the admin can fix the grant.
        console.error("[admin-create-user] subscription insert failed:", subErr);
        return json({ ok: true, user_id: userId, subscription: false, subscription_error: subErr.message });
      }
    }

    return json({ ok: true, user_id: userId, subscription: !!grantedUntil, free_until: grantedUntil });
  } catch (e) {
    console.error("[admin-create-user] error:", e);
    return json({ ok: false, code: "server_error", message: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
