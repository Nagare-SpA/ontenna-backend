import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  userId?: string;
  email?: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let { userId, email, code }: VerifyCodeRequest = await req.json();

    if (!code || (!userId && !email)) {
      return new Response(
        JSON.stringify({ error: "Missing code or user identifier" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Resolve userId by email when only the email is provided.
    if (!userId && email) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = prof?.id;
    }
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find valid verification code
    const { data: verificationCode, error: fetchError } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationCode) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark code as used
    await supabaseAdmin
      .from("verification_codes")
      .update({ used: true })
      .eq("id", verificationCode.id);

    // Confirm email in Supabase Auth (this allows login without Supabase's email confirmation)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (authError) {
      console.error("Error confirming email in auth:", authError);
      // Continue anyway - we'll still update the profile
    }

    // Update user profile to verified
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_verified: true,
        verification_status: "verified",
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
