import type { 
  PaymentProvider, 
  Plan, 
  Subscription, 
  CheckoutSessionResult, 
  CustomerPortalResult 
} from './types';

// Placeholder Stripe provider - throws clear errors when Stripe is not configured
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'StripePaymentProvider';
  readonly isMockMode = false;

  private throwNotConfigured(): never {
    throw new Error(
      '[Billing] Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment ' +
      'and set VITE_PAYMENT_PROVIDER=stripe. For development, use VITE_PAYMENT_PROVIDER=mock.'
    );
  }

  async getPlans(): Promise<Plan[]> {
    this.throwNotConfigured();
  }

  async getPlanById(_planId: string): Promise<Plan | null> {
    this.throwNotConfigured();
  }

  async createCheckoutSession(
    _planId: string, 
    _userId: string, 
    _billingPeriod: 'monthly' | 'yearly'
  ): Promise<CheckoutSessionResult> {
    this.throwNotConfigured();
  }

  async getSubscriptionStatus(_userId: string): Promise<Subscription | null> {
    this.throwNotConfigured();
  }

  async cancelSubscription(_subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    this.throwNotConfigured();
  }

  async getCustomerPortalUrl(_userId: string): Promise<CustomerPortalResult> {
    this.throwNotConfigured();
  }

  async updateSubscription(
    _userId: string, 
    _planId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.throwNotConfigured();
  }

  async resumeSubscription(_subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    this.throwNotConfigured();
  }
}
