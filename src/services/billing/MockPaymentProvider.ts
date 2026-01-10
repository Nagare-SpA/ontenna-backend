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

// Transform database row to Plan type
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
    stripeCustomerId: row.stripe_customer_id || undefined,
    stripeSubscriptionId: row.stripe_subscription_id || undefined
  };
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MockPaymentProvider';
  readonly isMockMode = true;

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
    console.log('[Billing] Mock checkout session created', { planId, userId, billingPeriod });

    // Get the plan
    const plan = await this.getPlanById(planId);
    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Check if user already has a subscription
    const existing = await this.getSubscriptionStatus(userId);

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null
        })
        .eq('user_id', userId);

      if (error) {
        console.error('[Billing] Error updating subscription:', error);
        return { success: false, error: 'Failed to update subscription' };
      }
    } else {
      // Create new subscription
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString()
        });

      if (error) {
        console.error('[Billing] Error creating subscription:', error);
        return { success: false, error: 'Failed to create subscription' };
      }
    }

    // Log billing event
    await supabase.from('billing_events').insert({
      user_id: userId,
      event_type: 'checkout.session.completed',
      event_data: { planId, billingPeriod, mockMode: true }
    });

    // Return mock session - in mock mode, we don't redirect
    return {
      success: true,
      sessionId: `mock_session_${Date.now()}`,
      sessionUrl: undefined // No redirect needed in mock mode
    };
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
    console.log('[Billing] Mock canceling subscription:', subscriptionId);

    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !sub) {
      return { success: false, error: 'Subscription not found' };
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      return { success: false, error: 'Failed to cancel subscription' };
    }

    // Log billing event
    await supabase.from('billing_events').insert({
      user_id: sub.user_id,
      subscription_id: subscriptionId,
      event_type: 'subscription.canceled',
      event_data: { mockMode: true }
    });

    return { success: true };
  }

  async getCustomerPortalUrl(userId: string): Promise<CustomerPortalResult> {
    console.log('[Billing] Mock customer portal requested for:', userId);
    
    // In mock mode, we return a special URL that will be handled by the app
    return {
      success: true,
      url: `/billing/manage?mock=true`
    };
  }

  async updateSubscription(
    userId: string, 
    planId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[Billing] Mock updating subscription:', { userId, planId });

    const plan = await this.getPlanById(planId);
    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ plan_id: planId })
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: 'Failed to update subscription' };
    }

    // Log billing event
    await supabase.from('billing_events').insert({
      user_id: userId,
      event_type: 'subscription.updated',
      event_data: { planId, mockMode: true }
    });

    return { success: true };
  }

  async resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    console.log('[Billing] Mock resuming subscription:', subscriptionId);

    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !sub) {
      return { success: false, error: 'Subscription not found' };
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        canceled_at: null
      })
      .eq('id', subscriptionId);

    if (error) {
      return { success: false, error: 'Failed to resume subscription' };
    }

    // Log billing event
    await supabase.from('billing_events').insert({
      user_id: sub.user_id,
      subscription_id: subscriptionId,
      event_type: 'subscription.resumed',
      event_data: { mockMode: true }
    });

    return { success: true };
  }
}
