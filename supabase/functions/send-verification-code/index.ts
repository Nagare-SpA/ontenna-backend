import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCodeRequest {
  userId: string;
  email: string;
  firstName?: string;
}

function generateCode(): string {
  // Cryptographically-secure 6-digit code (Math.random is not suitable for
  // auth secrets). Rejection-sample to avoid modulo bias.
  const max = 1000000;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let n = 0;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return (n % max).toString().padStart(6, "0");
}

// Anti-abuse cooldown (seconds) between code sends per user. Blocks
// email-bomb / Resend-quota-exhaustion via the public, unauthenticated endpoint.
const RESEND_COOLDOWN_SECONDS = 45;

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

    const { userId, email, firstName }: SendCodeRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing userId or email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Cooldown: refuse if a code was already issued to this user very recently.
    const { data: recent } = await supabaseAdmin
      .from("verification_codes")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.created_at) {
      const ageSeconds = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
        return new Response(
          JSON.stringify({ error: "Please wait before requesting another code", retry_after: Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds) }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
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
    const { error: insertError } = await supabaseAdmin
      .from("verification_codes")
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email
    const emailResponse = await resend.emails.send({
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
                      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
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
                      <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 2px solid #6366f1;">
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

    // Inspect the Resend result: a failed send must NOT report success, or the
    // user is stranded with no code. Log only the message id (never the full
    // object — it carries PII).
    if (emailResponse.error || !emailResponse.data?.id) {
      console.error("Resend send failed:", emailResponse.error?.message ?? "no message id returned");
      return new Response(
        JSON.stringify({ error: "Failed to send verification code" }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("Verification email sent:", emailResponse.data.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-verification-code function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
