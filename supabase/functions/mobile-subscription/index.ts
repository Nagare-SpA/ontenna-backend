import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Single source of truth for entitlement. The app historically read only
// subscriptions.current_period_end, which silently ignored complimentary grants
// held in subscriptions.free_until and personal_accounts.granted_free_until.
// Here we compute the effective access end = the furthest-future of every date
// that grants access, expose an explicit is_entitled, and return that effective
// end as current_period_end so existing clients unlock correctly.
// deno-lint-ignore no-explicit-any
export async function buildEntitlement(supabaseService: any, userId: string) {
  const { data: subscription } = await supabaseService
    .from("subscriptions")
    .select(`*, plans ( id, name, tier, stripe_price_id_monthly, stripe_price_id_yearly, features )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: personalAccount } = await supabaseService
    .from("personal_accounts")
    .select("granted_free_until, plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  const now = Date.now();
  const toMs = (d: string | null | undefined) => (d ? new Date(d).getTime() : NaN);
  const candidates = [
    toMs(subscription?.current_period_end),
    toMs(subscription?.free_until),
    toMs(subscription?.trial_end),
    toMs(personalAccount?.granted_free_until),
  ].filter((n) => !Number.isNaN(n));
  const effectiveEndMs = candidates.length ? Math.max(...candidates) : null;
  const statusActive = subscription
    ? ["active", "trialing", "past_due"].includes(subscription.status)
    : false;
  const suspended = personalAccount?.status === "suspended";
  const isEntitled = !suspended && ((effectiveEndMs !== null && effectiveEndMs > now) || statusActive);
  const effectiveEnd = effectiveEndMs !== null ? new Date(effectiveEndMs).toISOString() : null;

  const plan = subscription?.plans as
    | { id: string; name: string; tier: string; stripe_price_id_monthly: string | null; stripe_price_id_yearly: string | null; features: unknown[] }
    | undefined;

  if (isEntitled && plan) {
    return {
      status: statusActive ? subscription.status : "active",
      is_entitled: true,
      plan_key: plan.tier,
      plan_name: plan.name,
      price_id: plan.stripe_price_id_monthly || plan.stripe_price_id_yearly || null,
      current_period_start: subscription?.current_period_start ?? null,
      current_period_end: effectiveEnd,
      cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
      features: plan.features || [],
    };
  }

  if (isEntitled) {
    // Entitled purely by a complimentary grant with no plan row.
    return {
      status: "active",
      is_entitled: true,
      plan_key: "complimentary",
      plan_name: "Complimentary",
      price_id: null,
      current_period_start: null,
      current_period_end: effectiveEnd,
      cancel_at_period_end: false,
      features: [],
    };
  }

  return {
    status: "none",
    is_entitled: false,
    plan_key: "free",
    plan_name: null,
    price_id: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    features: [],
  };
}

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

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const subscriptionResponse = await buildEntitlement(supabaseService, user.id);

    return new Response(
      JSON.stringify({
        ok: true,
        subscription: subscriptionResponse,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mobile subscription error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: { code: "server_error", message: "Internal server error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
