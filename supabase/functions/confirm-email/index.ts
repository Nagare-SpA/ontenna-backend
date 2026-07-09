import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Confirms the caller's own email. Called right after a successful password
// recovery: possessing a valid recovery session proves email ownership, so we
// mark the address confirmed and the app never demands a verification code.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    if (user.email_confirmed_at) return json({ ok: true, already_confirmed: true });

    const { error } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (error) {
      console.error("[confirm-email] updateUserById failed:", error);
      return json({ ok: false, error: error.message }, 500);
    }

    console.log("[confirm-email] confirmed:", user.id);
    return json({ ok: true, confirmed: true });
  } catch (e) {
    console.error("[confirm-email] error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
