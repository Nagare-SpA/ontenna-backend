import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
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
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Email and password required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Brute-force / credential-stuffing lockout (per email). This endpoint is
    // public (verify_jwt=false), so it must self-limit.
    const LOCK_MAX = 8;
    const LOCK_WINDOW_MS = 15 * 60 * 1000;
    const emailKey = String(email).toLowerCase();
    const { data: la } = await supabaseService
      .from("login_attempts")
      .select("attempts, window_start")
      .eq("email", emailKey)
      .maybeSingle();
    const inWindow = la ? (Date.now() - new Date(la.window_start).getTime()) < LOCK_WINDOW_MS : false;
    if (la && inWindow && la.attempts >= LOCK_MAX) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "too_many_attempts", message: "Too many login attempts. Please try again later." } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in using existing auth system
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Record the failed attempt (reset the counter if the window elapsed).
      const nextAttempts = la && inWindow ? la.attempts + 1 : 1;
      await supabaseService.from("login_attempts").upsert({
        email: emailKey,
        attempts: nextAttempts,
        window_start: la && inWindow ? la.window_start : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // Uniform error (do not distinguish bad password from unknown user).
      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_credentials", message: "Invalid email or password" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Successful auth → clear the lockout counter.
    await supabaseService.from("login_attempts").delete().eq("email", emailKey);

    // Auth's email_confirmed_at is the source of truth for verification (the
    // web login uses the same signal). The profiles.is_verified flag can lag
    // behind when the email is confirmed by admin/reset paths, so don't gate on
    // it — that was blocking valid users from the app while the web let them in.
    if (!authData.user.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: { code: "email_not_verified", message: "Please verify your email before logging in" }
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Best-effort: keep the profile flag in sync so it stops diverging.
    await supabaseService
      .from("profiles")
      .update({ is_verified: true, verification_status: "verified" })
      .eq("id", authData.user.id)
      .eq("is_verified", false);

    // Return mobile-friendly response
    return new Response(
      JSON.stringify({
        ok: true,
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        token_type: "Bearer",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mobile login error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: { code: "server_error", message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
