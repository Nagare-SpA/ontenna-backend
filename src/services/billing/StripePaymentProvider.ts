import { supabase } from '@/integrations/supabase/client';
import type { 
  PaymentProvider, 
  Plan, 
  Subscription, 
  CheckoutSessionResult, 
  CustomerPortalResult,
  PlanTier,
  SubscriptionStatus
} from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function getFunctionsBaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error('Missing VITE_SUPABASE_URL');
  }
  return `${SUPABASE_URL}/functions/v1`;
}
function transformPlan(row: {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_yearly: number;
  features: unknown;
  is_active: boolean;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
}): Plan {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier as PlanTier,
    priceMonthly: row.price_monthly,
    priceYearly: row.price_yearly,
    features: Array.isArray(row.features) ? row.features as string[] : [],
    isActive: row.is_active,
    stripePriceIdMonthly: row.stripe_price_id_monthly || undefined,
    stripePriceIdYearly: row.stripe_price_id_yearly || undefined
  };
}

// Transform database row to Subscription type
function transformSubscription(row: {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  free_until?: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}, plan?: Plan): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    plan,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: new Date(row.current_period_start),
    currentPeriodEnd: new Date(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at ? new Date(row.canceled_at) : undefined,
    trialStart: row.trial_start ? new Date(row.trial_start) : undefined,
    trialEnd: row.trial_end ? new Date(row.trial_end) : undefined,
    freeUntil: row.free_until ? new Date(row.free_until) : undefined,
    stripeCustomerId: row.stripe_customer_id || undefined,
    stripeSubscriptionId: row.stripe_subscription_id || undefined
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'StripePaymentProvider';
  readonly isMockMode = false;

  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      console.error('[Billing] Error fetching plans:', error);
      return [];
    }

    return (data || []).map(transformPlan);
  }

  async getPlanById(planId: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !data) {
      return null;
    }

    return transformPlan(data);
  }

  async createCheckoutSession(
    planId: string, 
    userId: string, 
    billingPeriod: 'monthly' | 'yearly'
  ): Promise<CheckoutSessionResult> {
    console.log('[Billing] Creating Stripe checkout session', { planId, userId, billingPeriod });

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getFunctionsBaseUrl()}/stripe-checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId,
          billingPeriod,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/dashboard?checkout=canceled`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Billing] Checkout error:', data.error);
        return { success: false, error: data.error || 'Failed to create checkout session' };
      }

      return {
        success: true,
        sessionId: data.sessionId,
        sessionUrl: data.sessionUrl
      };
    } catch (error) {
      console.error('[Billing] Checkout error:', error);
      return { success: false, error: 'Failed to connect to payment service' };
    }
  }

  async getSubscriptionStatus(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Billing] Error fetching subscription:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const plan = data.plans ? transformPlan(data.plans as {
      id: string;
      name: string;
      tier: string;
      price_monthly: number;
      price_yearly: number;
      features: unknown;
      is_active: boolean;
      stripe_price_id_monthly: string | null;
      stripe_price_id_yearly: string | null;
    }) : undefined;

    return transformSubscription(data, plan);
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    console.log('[Billing] Canceling subscription:', subscriptionId);

    // First check if this subscription has a Stripe subscription ID
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .single();

    // If no Stripe subscription ID, just delete from database (legacy mock subscription)
    if (!subData?.stripe_subscription_id) {
      console.log('[Billing] No Stripe subscription ID, deleting from database directly');
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);
      
      if (error) {
        console.error('[Billing] Error deleting subscription:', error);
        return { success: false, error: 'Failed to cancel subscription' };
      }
      return { success: true };
    }

    // Has Stripe subscription - cancel through Stripe
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getFunctionsBaseUrl()}/stripe-subscription`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'cancel', subscriptionId })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel subscription' };
      }

      return { success: true };
    } catch (error) {
      console.error('[Billing] Cancel error:', error);
      return { success: false, error: 'Failed to connect to payment service' };
    }
  }

  async getCustomerPortalUrl(userId: string): Promise<CustomerPortalResult> {
    console.log('[Billing] Getting Stripe customer portal for:', userId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getFunctionsBaseUrl()}/stripe-portal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard` })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to get portal URL' };
      }

      return { success: true, url: data.url };
    } catch (error) {
      console.error('[Billing] Portal error:', error);
      return { success: false, error: 'Failed to connect to payment service' };
    }
  }

  async updateSubscription(
    userId: string, 
    planId: string
  ): Promise<{ success: boolean; error?: string }> {
    // For plan changes, redirect to customer portal or create new checkout
    console.log('[Billing] Plan change requested, redirecting to portal');
    const portal = await this.getCustomerPortalUrl(userId);
    
    if (portal.success && portal.url) {
      window.location.href = portal.url;
      return { success: true };
    }
    
    return { success: false, error: portal.error || 'Failed to open billing portal' };
  }

  async resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    console.log('[Billing] Resuming Stripe subscription:', subscriptionId);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getFunctionsBaseUrl()}/stripe-subscription`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'resume', subscriptionId })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to resume subscription' };
      }

      return { success: true };
    } catch (error) {
      console.error('[Billing] Resume error:', error);
      return { success: false, error: 'Failed to connect to payment service' };
    }
  }
}
