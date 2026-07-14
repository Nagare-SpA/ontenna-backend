import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// In-app password recovery, step 1: email a 6-digit code.
//
// Deliberately NOT a magic link — the whole reset happens inside the app
// (step 2 is mobile-reset-password). Always answers ok so the endpoint cannot
// be used to discover which emails have an account.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: { code: "method_not_allowed", message: "Only POST allowed" } }, 405);

  try {
    const { email } = await req.json();
    if (!email) return json({ ok: false, error: { code: "invalid_request", message: "Email required" } }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name")
      .eq("email", email)
      .maybeSingle();

    // Unknown email: answer exactly as if it worked (no account enumeration).
    if (!profile) {
      console.log("[mobile-forgot-password] no account for that email; answering ok");
      return json({ ok: true, message: "reset_code_sent" });
    }

    // Burn any outstanding codes, then issue a fresh one.
    await supabase.from("verification_codes")
      .update({ used: true })
      .eq("user_id", profile.id)
      .eq("used", false);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { data: inserted, error: insertError } = await supabase
      .from("verification_codes")
      .insert({ user_id: profile.id, code, expires_at: expiresAt.toISOString() })
      .select("id")
      .single();

    if (insertError) {
      console.error("[mobile-forgot-password] insert failed:", insertError);
      return json({ ok: false, error: { code: "server_error", message: "Could not create reset code" } }, 500);
    }

    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("[mobile-forgot-password] RESEND_API_KEY not configured");
      return json({ ok: false, error: { code: "email_not_configured", message: "Email is not configured" } }, 500);
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Ontenna <no-reply@ontenna.org>",
      to: [email],
      subject: "🔑 Your Ontenna password reset code",
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;">
            <tr><td align="center" style="padding:40px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;">
                <tr><td style="padding:40px 40px 24px;text-align:center;">
                  <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;">Reset your password</h1>
                </td></tr>
                <tr><td style="padding:0 40px 32px;">
                  <p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#475569;text-align:center;">
                    Hi${profile.first_name ? ` <strong>${profile.first_name}</strong>` : ""}! Enter this code in the Ontenna app to set a new password:
                  </p>
                  <div style="background-color:#1e293b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;border:2px solid #6366f1;">
                    <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#ffffff;font-family:'Courier New',monospace;">${code}</span>
                  </div>
                  <p style="margin:0;font-size:14px;line-height:20px;color:#94a3b8;text-align:center;">
                    ⏱️ This code expires in <strong>15 minutes</strong>
                  </p>
                </td></tr>
                <tr><td style="padding:24px 40px 40px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#94a3b8;text-align:center;">
                    Didn't request this? You can safely ignore this email — your password will not change.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:20px;color:#94a3b8;text-align:center;">— The Ontenna Team</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
      `,
    });

    // The Resend SDK returns { error } instead of throwing — never report
    // success for a mail that was not actually sent.
    if (emailError) {
      console.error("[mobile-forgot-password] Resend send failed:", emailError);
      return json({ ok: false, error: { code: "email_send_failed", message: emailError.message ?? "Could not send the email" } }, 502);
    }

    await supabase.from("verification_codes")
      .update({ email_sent: true, resend_id: emailData?.id ?? null })
      .eq("id", inserted.id);

    console.log("[mobile-forgot-password] reset code sent. Resend id:", emailData?.id);
    return json({ ok: true, message: "reset_code_sent" });
  } catch (error) {
    console.error("[mobile-forgot-password] unexpected:", error);
    return json({ ok: false, error: { code: "server_error", message: "Internal server error" } }, 500);
  }
});
