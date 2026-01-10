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

    const { planId, billingPeriod, successUrl, cancelUrl, embedded } = await req.json();

    if (!planId || !billingPeriod) {
      return new Response(
        JSON.stringify({ error: "Missing planId or billingPeriod" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get plan from database
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripePriceId = billingPeriod === "yearly" 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;

    if (!stripePriceId) {
      return new Response(
        JSON.stringify({ error: "Plan does not have a Stripe price configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if user already has a Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Check if customer exists in Stripe by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id }
        });
        customerId = customer.id;
      }
    }

    // Create checkout session - embedded or redirect mode
    if (embedded) {
      // Embedded checkout mode
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded",
        return_url: successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          billing_period: billingPeriod
        }
      });

      console.log("[Stripe] Embedded checkout session created:", session.id);

      return new Response(
        JSON.stringify({ clientSecret: session.client_secret }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Redirect checkout mode (legacy)
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
        cancel_url: cancelUrl || `${req.headers.get("origin")}/dashboard?checkout=canceled`,
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          billing_period: billingPeriod
        }
      });

      console.log("[Stripe] Redirect checkout session created:", session.id);

      return new Response(
        JSON.stringify({ sessionId: session.id, sessionUrl: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[Stripe] Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
