import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[Stripe] Missing STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, subscriptionId } = await req.json();
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get user's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always use the Stripe subscription ID, not the database ID
    const stripeSubId = subscription.stripe_subscription_id;
    console.log("[Stripe] Using Stripe subscription ID:", stripeSubId);

    switch (action) {
      case "cancel": {
        // Cancel at period end
        const updated = await stripe.subscriptions.update(stripeSubId, {
          cancel_at_period_end: true
        });

        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: true,
            canceled_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        console.log("[Stripe] Subscription canceled at period end:", stripeSubId);

        return new Response(
          JSON.stringify({ success: true, cancelAtPeriodEnd: updated.cancel_at_period_end }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resume": {
        // Resume subscription (remove cancel_at_period_end)
        const updated = await stripe.subscriptions.update(stripeSubId, {
          cancel_at_period_end: false
        });

        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: false,
            canceled_at: null
          })
          .eq("user_id", user.id);

        console.log("[Stripe] Subscription resumed:", stripeSubId);

        return new Response(
          JSON.stringify({ success: true, cancelAtPeriodEnd: updated.cancel_at_period_end }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        // Get current status from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId);

        return new Response(
          JSON.stringify({
            status: stripeSubscription.status,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[Stripe] Subscription action error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
