// Billing types and interfaces

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused' | 'unpaid';
export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isActive: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  error?: string;
}

export interface CustomerPortalResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface BillingEvent {
  id: string;
  userId: string;
  subscriptionId?: string;
  eventType: string;
  eventData: Record<string, unknown>;
  stripeEventId?: string;
  createdAt: Date;
}

// Payment provider interface - the abstraction layer
export interface PaymentProvider {
  readonly name: string;
  readonly isMockMode: boolean;
  
  // Core methods
  createCheckoutSession(planId: string, userId: string, billingPeriod: 'monthly' | 'yearly'): Promise<CheckoutSessionResult>;
  getSubscriptionStatus(userId: string): Promise<Subscription | null>;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
  getCustomerPortalUrl(userId: string): Promise<CustomerPortalResult>;
  
  // Plan management
  getPlans(): Promise<Plan[]>;
  getPlanById(planId: string): Promise<Plan | null>;
  
  // Subscription management
  updateSubscription(userId: string, planId: string): Promise<{ success: boolean; error?: string }>;
  resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }>;
}

// Feature access based on plan tier
export const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: ['basic_features', 'single_project', 'community_support'],
  basic: ['basic_features', 'multiple_projects', 'email_support', 'basic_analytics'],
  pro: ['all_features', 'unlimited_projects', 'priority_support', 'advanced_analytics', 'api_access'],
  enterprise: ['all_features', 'unlimited_projects', 'dedicated_support', 'custom_integrations', 'sla_guarantee', 'admin_dashboard']
};

// Plan tier hierarchy for comparison
export const PLAN_TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3
};

export function hasFeatureAccess(userTier: PlanTier, requiredTier: PlanTier): boolean {
  return PLAN_TIER_ORDER[userTier] >= PLAN_TIER_ORDER[requiredTier];
}
