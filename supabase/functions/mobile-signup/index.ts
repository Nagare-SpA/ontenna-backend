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
    const { first_name, last_name, email, password, country, locale } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Missing required fields" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Use existing signup logic - same as web platform
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          account_type: "end_user",
          country: country || null,
          locale: locale || null,
        },
      },
    });

    if (authError) {
      // Check for existing user
      if (authError.message.includes("already registered")) {
        return new Response(
          JSON.stringify({ ok: false, error: { code: "email_exists", message: "Email already registered" } }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ ok: false, error: { code: "signup_failed", message: authError.message } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "signup_failed", message: "Failed to create user" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger existing verification flow
    const supabaseServiceUrl = Deno.env.get("SUPABASE_URL")!;
    const verificationResponse = await fetch(`${supabaseServiceUrl}/functions/v1/send-verification-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({
        userId: authData.user.id,
        email: email,
        firstName: first_name,
      }),
    });

    if (!verificationResponse.ok) {
      console.error("Failed to send verification code:", await verificationResponse.text());
      // Don't fail signup, just log the error
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "verification_required",
        user_id: authData.user.id,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mobile signup error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: { code: "server_error", message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
