import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: { code: "method_not_allowed", message: "Only POST allowed" } }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Email and code required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "user_not_found", message: "User not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Brute-force protection: a 6-digit code has only 10^6 combinations, so we
    // track guesses against the user's active code and invalidate it after
    // MAX_ATTEMPTS wrong tries. We look up the active code by USER (not by the
    // guessed value) so failed guesses can be counted.
    const MAX_ATTEMPTS = 5;
    const { data: activeCode } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("user_id", profile.id)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeCode) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "expired_code", message: "Verification code expired or not found. Request a new one." } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((activeCode.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase.from("verification_codes").update({ used: true }).eq("id", activeCode.id);
      return new Response(
        JSON.stringify({ ok: false, error: { code: "too_many_attempts", message: "Too many attempts. Request a new code." } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (activeCode.code !== String(code)) {
      await supabase
        .from("verification_codes")
        .update({ attempts: (activeCode.attempts ?? 0) + 1 })
        .eq("id", activeCode.id);
      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_code", message: "Invalid verification code" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verificationCode = activeCode;

    // Mark code as used
    await supabase
      .from("verification_codes")
      .update({ used: true })
      .eq("id", verificationCode.id);

    // Update user's email confirmation in Supabase Auth
    await supabase.auth.admin.updateUserById(profile.id, {
      email_confirm: true,
    });

    // Update profile verification status
    await supabase
      .from("profiles")
      .update({
        is_verified: true,
        verification_status: "verified",
      })
      .eq("id", profile.id);

    return new Response(
      JSON.stringify({ ok: true, message: "email_verified" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mobile verify email error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: { code: "server_error", message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
