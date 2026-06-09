import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Idempotent, single-call account creation for the web.
//   1. Validates the password (length + HIBP leaked-password check).
//   2. Creates the user UNCONFIRMED via the admin API (no native email).
//      Because email confirmations are required, an unconfirmed user CANNOT
//      log in until they enter the 6-digit code (verify-code confirms them).
//   3. Sends the verification code (single source of truth).
// Re-running with the same email returns `already_exists` without duplicating.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// HaveIBeenPwned range API (k-anonymity): never sends the full password.
async function isPwned(pw: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = hex.slice(0, 5), suffix = hex.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) return false; // fail open — don't block signups on an HIBP outage
    const text = await res.text();
    return text.split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { email, password, first_name, last_name } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return json({ ok: false, code: "invalid_request", message: "Missing required fields" }, 400);
    }
    if (typeof password !== "string" || password.length < 8) {
      return json({ ok: false, code: "weak_password", message: "Password must be at least 8 characters." }, 400);
    }
    if (await isPwned(password)) {
      return json({ ok: false, code: "weak_password", message: "This password has appeared in a data breach. Please choose a different one." }, 400);
    }

    // Create the user UNCONFIRMED — no native email is sent by the admin API.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name, last_name, account_type: "end_user" },
    });

    if (error) {
      const msg = error.message || "";
      if (/already.*registered|already.*exists|already been registered/i.test(msg)) {
        return json({ ok: false, code: "already_exists", message: "This email already has an account." }, 409);
      }
      if (/password/i.test(msg)) {
        return json({ ok: false, code: "weak_password", message: msg }, 400);
      }
      return json({ ok: false, code: "signup_failed", message: msg }, 400);
    }

    const userId = data.user?.id;
    if (!userId) return json({ ok: false, code: "signup_failed", message: "Could not create account" }, 500);

    // Send the verification code (single source of truth).
    let codeSent = true;
    try {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
        body: JSON.stringify({ userId, email, firstName: first_name }),
      });
      codeSent = r.ok;
    } catch { codeSent = false; }

    return json({ ok: true, message: "verification_required", user_id: userId, code_sent: codeSent });
  } catch (error) {
    console.error("[web-signup] error:", error);
    return json({ ok: false, code: "server_error", message: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
