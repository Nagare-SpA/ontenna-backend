import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCodeRequest {
  userId?: string;
  email: string;
  firstName?: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    let { userId, email, firstName }: SendCodeRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Allow resolving the user by email (e.g. login-time re-verification).
    if (!userId) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = prof?.id;
    }
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Invalidate any existing unused codes for this user
    await supabaseAdmin
      .from("verification_codes")
      .update({ used: true })
      .eq("user_id", userId)
      .eq("used", false);

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store code in database
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("verification_codes")
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "email_not_configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Ontenna <no-reply@ontenna.org>",
      to: [email],
      subject: "🔐 Your Ontenna Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 24px; text-align: center;">
                      <div style="width: 64px; height: 64px; background-color: #6366f1; background-image: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">🔐</span>
                      </div>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">Verify Your Email</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 32px;">
                      <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #475569; text-align: center;">
                        Hi${firstName ? ` <strong>${firstName}</strong>` : ""}! Enter this code to complete your verification:
                      </p>
                      <!-- Code Box -->
                      <div style="background-color: #1e293b; background-image: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 2px solid #6366f1;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace;">${code}</span>
                      </div>
                      <p style="margin: 0; font-size: 14px; line-height: 20px; color: #94a3b8; text-align: center;">
                        ⏱️ This code expires in <strong>15 minutes</strong>
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px 40px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px; font-size: 13px; line-height: 20px; color: #94a3b8; text-align: center;">
                        Didn't request this? You can safely ignore this email.
                      </p>
                      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8; text-align: center;">
                        — The Ontenna Team
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    // The Resend SDK does NOT throw on API errors — it returns { error }.
    // Treat that as a hard failure so we never report success without sending.
    if (emailError) {
      console.error("Resend send failed:", emailError);
      return new Response(
        JSON.stringify({ error: "email_send_failed", detail: emailError.message ?? String(emailError) }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully. Resend id:", emailData?.id);

    // Audit: mark that the email actually went out (best-effort).
    if (inserted?.id) {
      await supabaseAdmin
        .from("verification_codes")
        .update({ email_sent: true, resend_id: emailData?.id ?? null })
        .eq("id", inserted.id);
    }

    return new Response(
      JSON.stringify({ success: true, id: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
