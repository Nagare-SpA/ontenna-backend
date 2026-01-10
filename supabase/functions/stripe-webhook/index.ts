import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      console.error("[Stripe Webhook] Missing STRIPE_SECRET_KEY");
      return new Response("Stripe not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        // Use constructEventAsync for Deno compatibility
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe Webhook] Signature verification failed:", message);
        return new Response(`Webhook signature verification failed`, { status: 400 });
      }
    } else {
      // Parse without verification (for development)
      console.warn("[Stripe Webhook] No webhook secret configured, skipping signature verification");
      event = JSON.parse(body);
    }

    console.log("[Stripe Webhook] Received event:", event.type);

    // Helper to get plan by Stripe price ID
    async function getPlanByPriceId(priceId: string) {
      const { data } = await supabase
        .from("plans")
        .select("id")
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .maybeSingle();
      return data;
    }

    // Helper to map Stripe status to our status
    function mapStripeStatus(status: string): string {
      const statusMap: Record<string, string> = {
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        incomplete: "incomplete",
        incomplete_expired: "incomplete_expired",
        trialing: "trialing",
        paused: "paused",
        unpaid: "unpaid"
      };
      return statusMap[status] || "active";
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id;

        if (!userId) {
          console.error("[Stripe Webhook] No user ID in session metadata");
          break;
        }

        // Get subscription details from Stripe
        if (session.subscription) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const periodStart = new Date(stripeSubscription.current_period_start * 1000);
          const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

          // Upsert subscription in database
          const { error } = await supabase
            .from("subscriptions")
            .upsert({
              user_id: userId,
              plan_id: planId,
              status: mapStripeStatus(stripeSubscription.status),
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: stripeSubscription.id,
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: stripeSubscription.cancel_at_period_end
            }, { onConflict: "user_id" });

          if (error) {
            console.error("[Stripe Webhook] Error upserting subscription:", error);
          }

          // Log billing event
          await supabase.from("billing_events").insert({
            user_id: userId,
            event_type: "checkout.session.completed",
            event_data: {
              session_id: session.id,
              subscription_id: stripeSubscription.id,
              plan_id: planId
            },
            stripe_event_id: event.id
          });
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.log("[Stripe Webhook] No user ID in subscription metadata for created event");
          break;
        }

        // Get plan from price ID
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? await getPlanByPriceId(priceId) : null;

        if (!plan) {
          console.error("[Stripe Webhook] No plan found for price:", priceId);
          break;
        }

        const periodStart = new Date(subscription.current_period_start * 1000);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        // Check if subscription already exists
        const { data: existingSubForCreate } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingSubForCreate) {
          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan_id: plan.id,
              status: mapStripeStatus(subscription.status),
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              trial_start: subscription.trial_start 
                ? new Date(subscription.trial_start * 1000).toISOString() 
                : null,
              trial_end: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null
            });

          if (error) {
            console.error("[Stripe Webhook] Error creating subscription:", error);
          }

          // Log billing event
          await supabase.from("billing_events").insert({
            user_id: userId,
            event_type: "customer.subscription.created",
            event_data: {
              subscription_id: subscription.id,
              plan_id: plan.id,
              status: subscription.status
            },
            stripe_event_id: event.id
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id, id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!existingSub) {
          console.log("[Stripe Webhook] No subscription found for customer:", customerId);
          break;
        }

        // Get plan from price ID
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? await getPlanByPriceId(priceId) : null;

        const periodStart = new Date(subscription.current_period_start * 1000);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        const updateData: Record<string, unknown> = {
          status: mapStripeStatus(subscription.status),
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString() 
            : null
        };

        if (plan) {
          updateData.plan_id = plan.id;
        }

        const { error } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[Stripe Webhook] Error updating subscription:", error);
        }

        // Log billing event
        await supabase.from("billing_events").insert({
          user_id: existingSub.user_id,
          subscription_id: existingSub.id,
          event_type: "customer.subscription.updated",
          event_data: {
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end
          },
          stripe_event_id: event.id
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find and update subscription
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id, id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString()
            })
            .eq("stripe_customer_id", customerId);

          // Log billing event
          await supabase.from("billing_events").insert({
            user_id: existingSub.user_id,
            subscription_id: existingSub.id,
            event_type: "customer.subscription.deleted",
            event_data: { subscription_id: subscription.id },
            stripe_event_id: event.id
          });
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id, id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          await supabase.from("billing_events").insert({
            user_id: existingSub.user_id,
            subscription_id: existingSub.id,
            event_type: event.type,
            event_data: {
              invoice_id: invoice.id,
              amount_paid: invoice.amount_paid,
              currency: invoice.currency
            },
            stripe_event_id: event.id
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id, id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (existingSub) {
          // Update status to past_due
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_customer_id", customerId);

          await supabase.from("billing_events").insert({
            user_id: existingSub.user_id,
            subscription_id: existingSub.id,
            event_type: "invoice.payment_failed",
            event_data: {
              invoice_id: invoice.id,
              amount_due: invoice.amount_due
            },
            stripe_event_id: event.id
          });
        }
        break;
      }

      default:
        console.log("[Stripe Webhook] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
