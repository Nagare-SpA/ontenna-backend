import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Self-service account deletion (Apple App Store requirement).
//
// The user_id ALWAYS comes from the verified JWT's `sub` claim — never from the
// body — so a caller can only ever delete themselves. The deletion is real and
// irreversible (no "deactivate"), and it is idempotent: if the account is
// already gone we still answer 200.

// Tables holding user data, deleted before the auth user itself.
// (child/most-dependent first)
const USER_TABLES: Array<{ table: string; column: string }> = [
  { table: "verification_codes", column: "user_id" },
  { table: "billing_events", column: "user_id" },
  { table: "learn_user_progress", column: "user_id" },
  { table: "app_store_transactions", column: "user_id" },
  { table: "subscriptions", column: "user_id" },
  { table: "user_roles", column: "user_id" },
  { table: "personal_accounts", column: "user_id" },
  { table: "profiles", column: "id" },
];

// Best-effort: decode a JWT payload WITHOUT trusting it. Only ever used to look
// up whether an account still exists (for idempotency) — never to authorize a
// deletion.
function unsafeDecodeSub(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(atob(b64))?.sub ?? null;
  } catch {
    return null;
  }
}

async function cancelStripeSubscription(subscriptionId: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return;
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) console.error("[delete-account] Stripe cancel failed:", await res.text());
    else console.log("[delete-account] Stripe subscription canceled:", subscriptionId);
  } catch (e) {
    console.error("[delete-account] Stripe cancel error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Invalid or expired token" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();

    // Authorize: the ONLY source of the user id is the verified token.
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      // Either the token is bad, or the account was already deleted. Only the
      // latter may answer 200 (idempotency) — and it deletes nothing.
      const sub = unsafeDecodeSub(token);
      if (sub) {
        const { data: existing } = await supabase.auth.admin.getUserById(sub);
        if (!existing?.user) {
          console.log("[delete-account] already deleted, idempotent 200:", sub);
          return json({ success: true });
        }
      }
      return json({ error: "Invalid or expired token" }, 401);
    }

    const userId = user.id;
    console.log("[delete-account] deleting user:", userId);

    // Cancel an active Stripe subscription before dropping the row.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (sub?.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(sub.status)) {
      await cancelStripeSubscription(sub.stripe_subscription_id);
    }

    // Purge every table carrying this user's data.
    for (const { table, column } of USER_TABLES) {
      const { error } = await supabase.from(table).delete().eq(column, userId);
      if (error) {
        console.error(`[delete-account] failed deleting from ${table}:`, error);
        return json({ error: `Failed to delete ${table}: ${error.message}` }, 500);
      }
    }

    // Finally, the auth user itself. Real deletion, not a soft-disable.
    const { error: delError } = await supabase.auth.admin.deleteUser(userId);
    if (delError) {
      console.error("[delete-account] auth deletion failed:", delError);
      return json({ error: delError.message }, 500);
    }

    console.log("[delete-account] deleted:", userId);
    return json({ success: true });
  } catch (e) {
    console.error("[delete-account] unexpected:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
