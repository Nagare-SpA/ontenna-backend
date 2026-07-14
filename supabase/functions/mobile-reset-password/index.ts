import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// In-app password recovery, step 2: exchange the 6-digit code for a new password.
// Body: { email, code, new_password }
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: { code: "method_not_allowed", message: "Only POST allowed" } }, 405);

  try {
    const { email, code, new_password } = await req.json();

    if (!email || !code || !new_password) {
      return json({ ok: false, error: { code: "invalid_request", message: "email, code and new_password are required" } }, 400);
    }
    if (typeof new_password !== "string" || new_password.length < 8) {
      return json({ ok: false, error: { code: "weak_password", message: "Password must be at least 8 characters." } }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      return json({ ok: false, error: { code: "invalid_code", message: "Invalid or expired code" } }, 400);
    }

    // Find a live, unused code for this user.
    const { data: vc } = await supabase
      .from("verification_codes")
      .select("id")
      .eq("user_id", profile.id)
      .eq("code", String(code))
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!vc) {
      return json({ ok: false, error: { code: "invalid_code", message: "Invalid or expired code" } }, 400);
    }

    // Set the password FIRST: if the policy rejects it (too short, or found in a
    // known breach), the code stays usable so the user can simply pick another.
    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
      password: new_password,
      email_confirm: true, // holding the emailed code proves ownership
    });

    if (updateError) {
      const msg = updateError.message || "";
      if (/password|weak|pwned|breach/i.test(msg)) {
        return json({ ok: false, error: { code: "weak_password", message: msg } }, 400);
      }
      console.error("[mobile-reset-password] update failed:", updateError);
      return json({ ok: false, error: { code: "server_error", message: msg } }, 500);
    }

    // Password changed — now burn the code so it cannot be replayed.
    await supabase.from("verification_codes").update({ used: true }).eq("id", vc.id);

    // Keep the profile flag consistent (mobile-login and the web both rely on it).
    await supabase.from("profiles")
      .update({ is_verified: true, verification_status: "verified" })
      .eq("id", profile.id);

    console.log("[mobile-reset-password] password reset for:", profile.id);
    return json({ ok: true, message: "password_reset" });
  } catch (error) {
    console.error("[mobile-reset-password] unexpected:", error);
    return json({ ok: false, error: { code: "server_error", message: "Internal server error" } }, 500);
  }
});
