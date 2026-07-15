import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { email, redirectUrl } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Email required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // The recovery link needs a redirect target: `send-password-reset` uses it
    // as the link's `redirectTo`, and when it is missing the emailed link is
    // broken (this was the "reset password doesn't work" bug from mobile). The
    // mobile client has no `window.location.origin` like the web does, so we
    // resolve the target here: caller-provided `redirectUrl` (e.g. a future app
    // deep link) -> `SITE_URL` env -> hardcoded production web reset page.
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://app.ontenna.org";
    const resolvedRedirectUrl =
      typeof redirectUrl === "string" && redirectUrl.length > 0
        ? redirectUrl
        : `${siteUrl.replace(/\/$/, "")}/reset-password`;

    // Call existing send-password-reset function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-password-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({ email, redirectUrl: resolvedRedirectUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Password reset error:", errorData);

      // Don't reveal if email exists or not for security
      return new Response(
        JSON.stringify({
          ok: true,
          message: "password_reset_sent"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "password_reset_sent"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mobile forgot password error:", error);
    // Still return success to not reveal email existence
    return new Response(
      JSON.stringify({ ok: true, message: "password_reset_sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
