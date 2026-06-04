import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Idempotent, single-call account creation for the web.
// Does everything atomically server-side:
//   1. Creates the user via GoTrue signup (which ENFORCES the password
//      policy + HIBP leaked-password check).
//   2. If the email already exists, returns a clear `already_exists`
//      WITHOUT creating a duplicate or throwing — calling twice is safe.
//   3. Sends the 6-digit verification code (one source of truth:
//      the send-verification-code function).
// The client makes ONE call and gets ONE unambiguous result.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { email, password, first_name, last_name } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return json({ ok: false, code: "invalid_request", message: "Missing required fields" }, 400);
    }
    if (typeof password !== "string" || password.length < 8) {
      return json({ ok: false, code: "weak_password", message: "Password must be at least 8 characters." }, 400);
    }

    // 1. Create via GoTrue signup — enforces password policy + HIBP.
    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({
        email,
        password,
        data: { first_name, last_name, account_type: "end_user" },
      }),
    });
    const signup = await signupRes.json();

    if (!signupRes.ok) {
      const code = signup.error_code || signup.code || "";
      const msg: string = signup.msg || signup.error_description || signup.error || "Sign up failed";
      if (/already.?registered|already.?exists|user_already_exists/i.test(`${code} ${msg}`)) {
        return json({ ok: false, code: "already_exists", message: "This email already has an account." }, 409);
      }
      if (/weak_password|pwned|leaked|password/i.test(`${code} ${msg}`)) {
        return json({ ok: false, code: "weak_password", message: msg }, 400);
      }
      return json({ ok: false, code: "signup_failed", message: msg }, 400);
    }

    // GoTrue may return the user at the top level or under `.user`.
    const userObj = signup.user ?? signup;
    const userId: string | undefined = userObj?.id;
    const identities = userObj?.identities;

    // Anti-enumeration: existing email comes back with an empty identities array.
    if (!userId || (Array.isArray(identities) && identities.length === 0)) {
      return json({ ok: false, code: "already_exists", message: "This email already has an account." }, 409);
    }

    // 3. Send the verification code (single source of truth).
    let codeSent = true;
    try {
      const codeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON },
        body: JSON.stringify({ userId, email, firstName: first_name }),
      });
      codeSent = codeRes.ok;
    } catch (_e) {
      codeSent = false;
    }

    return json({ ok: true, message: "verification_required", user_id: userId, code_sent: codeSent });
  } catch (error) {
    console.error("[web-signup] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ ok: false, code: "server_error", message }, 500);
  }
});
