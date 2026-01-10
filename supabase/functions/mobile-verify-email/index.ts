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

    // Use existing verification logic - check for valid code
    const { data: verificationCode, error: codeError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("user_id", profile.id)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (codeError || !verificationCode) {
      // Check if code exists but is expired
      const { data: expiredCode } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("user_id", profile.id)
        .eq("code", code)
        .single();

      if (expiredCode) {
        return new Response(
          JSON.stringify({ ok: false, error: { code: "expired_code", message: "Verification code has expired" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_code", message: "Invalid verification code" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
