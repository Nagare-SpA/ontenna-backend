import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: { code: "method_not_allowed", message: "Only GET allowed" } }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Extract auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "unauthorized", message: "Missing or invalid authorization header" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify token and get user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "unauthorized", message: "Invalid or expired token" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database queries
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch profile using existing data
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ ok: false, error: { code: "profile_not_found", message: "User profile not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscription using existing data
    const { data: subscription } = await supabaseService
      .from("subscriptions")
      .select(`
        *,
        plans (
          id,
          name,
          tier,
          stripe_price_id_monthly,
          stripe_price_id_yearly,
          features
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Build subscription response
    let subscriptionResponse: {
      status: string;
      plan_key: string;
      plan_name: string | null;
      price_id: string | null;
      current_period_start: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
      features: unknown[];
    };

    if (subscription && subscription.plans) {
      const plan = subscription.plans as {
        id: string;
        name: string;
        tier: string;
        stripe_price_id_monthly: string | null;
        stripe_price_id_yearly: string | null;
        features: unknown[];
      };
      
      subscriptionResponse = {
        status: subscription.status,
        plan_key: plan.tier,
        plan_name: plan.name,
        price_id: plan.stripe_price_id_monthly || plan.stripe_price_id_yearly || null,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        features: plan.features || [],
      };
    } else {
      // No active subscription
      subscriptionResponse = {
        status: "none",
        plan_key: "free",
        plan_name: null,
        price_id: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        features: [],
      };
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          email_verified: profile.is_verified,
          account_type: profile.account_type,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        subscription: subscriptionResponse,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mobile me error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: { code: "server_error", message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
