import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// HaveIBeenPwned range API (k-anonymity): never sends the full password.
async function isPwned(pw: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`);
    if (!res.ok) return false; // fail open on HIBP outage
    return (await res.text()).split("\n").some((line) => line.split(":")[0].trim() === hex.slice(5));
  } catch {
    return false;
  }
}

// Mobile signup. Mirrors web-signup: creates the account UNCONFIRMED via the
// admin API (no native GoTrue email — that mailer is rate-limited to 2/hour and
// was making signups fail with "email rate limit exceeded"), then sends our own
// 6-digit verification code via Resend.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: { code: "method_not_allowed", message: "Only POST allowed" } }, 405);

  try {
    const { first_name, last_name, email, password, country, locale } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return json({ ok: false, error: { code: "invalid_request", message: "Missing required fields" } }, 400);
    }
    if (typeof password !== "string" || password.length < 8) {
      return json({ ok: false, error: { code: "weak_password", message: "Password must be at least 8 characters." } }, 400);
    }
    if (await isPwned(password)) {
      return json({ ok: false, error: { code: "weak_password", message: "This password has appeared in a data breach. Please choose a different one." } }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Create the user UNCONFIRMED — the admin API sends no email.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name,
        last_name,
        account_type: "end_user",
        country: country || null,
        locale: locale || null,
      },
    });

    if (error) {
      const msg = error.message || "";
      if (/already.*registered|already.*exists|already been registered/i.test(msg)) {
        return json({ ok: false, error: { code: "email_exists", message: "Email already registered" } }, 409);
      }
      if (/password/i.test(msg) || /pwned|weak/i.test(msg)) {
        return json({ ok: false, error: { code: "weak_password", message: msg } }, 400);
      }
      return json({ ok: false, error: { code: "signup_failed", message: msg } }, 400);
    }

    const userId = data.user?.id;
    if (!userId) return json({ ok: false, error: { code: "signup_failed", message: "Failed to create user" } }, 500);

    // Send our own verification code (Resend).
    const verificationResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-verification-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ userId, email, firstName: first_name }),
    });
    if (!verificationResponse.ok) {
      console.error("Failed to send verification code:", await verificationResponse.text());
    }

    return json({ ok: true, message: "verification_required", user_id: userId, code_sent: verificationResponse.ok }, 201);
  } catch (error) {
    console.error("Mobile signup error:", error);
    return json({ ok: false, error: { code: "server_error", message: "Internal server error" } }, 500);
  }
});
