import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One-time, no-card free trial. Grants 30 days of full ("pro") access and
// flags the account so the trial can never be claimed again.
const TRIAL_DAYS = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    // Has this account already used its trial?
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("has_used_trial")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[Trial] Error loading profile:", profileError);
      return json({ error: "Could not load your profile" }, 500);
    }

    if (profile?.has_used_trial) {
      return json({ error: "trial_already_used", message: "You have already used your free trial." }, 409);
    }

    // Already has a subscription row? Don't override it.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return json({ error: "subscription_exists", message: "You already have a subscription." }, 409);
    }

    // Grant full ("pro") access for the trial period.
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("tier", "pro")
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      console.error("[Trial] Pro plan not found:", planError);
      return json({ error: "Trial plan is not available" }, 500);
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "trialing",
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
    });

    if (subError) {
      console.error("[Trial] Error creating subscription:", subError);
      return json({ error: "Could not start your trial" }, 500);
    }

    // Burn the trial so it can never be used again.
    const { error: flagError } = await supabase
      .from("profiles")
      .update({ has_used_trial: true })
      .eq("id", user.id);

    if (flagError) {
      console.error("[Trial] Error flagging trial as used:", flagError);
      // Subscription was created; don't fail the request over the flag, but log it.
    }

    // Audit trail (best-effort)
    await supabase.from("billing_events").insert({
      user_id: user.id,
      event_type: "trial_started",
      event_data: { trial_days: TRIAL_DAYS, trial_end: trialEnd.toISOString() },
    });

    console.log("[Trial] Started for user:", user.id);
    return json({ success: true, trialEnd: trialEnd.toISOString() });
  } catch (error) {
    console.error("[Trial] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
