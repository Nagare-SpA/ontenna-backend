// Billing configuration

export type PaymentProviderType = 'mock' | 'stripe';

interface BillingConfig {
  provider: PaymentProviderType;
  stripePublishableKey?: string;
  mockModeEnabled: boolean;
}

// Get payment provider from environment
function getPaymentProvider(): PaymentProviderType {
  const envProvider = import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined;
  
  if (envProvider === 'mock') {
    return 'mock';
  }
  
  // Default to Stripe mode (real payments)
  return 'stripe';
}

// Check if Stripe keys are available
function hasStripeKeys(): boolean {
  // Publishable key is optional in our flow because we redirect to Stripe Checkout via a session URL.
  // (The secret key is stored server-side in Supabase Edge Functions.)
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  return !!publishableKey;
}

export function getBillingConfig(): BillingConfig {
  const provider = getPaymentProvider();
  const mockModeEnabled = provider === 'mock';

  // Log billing mode
  if (mockModeEnabled) {
    console.log('[Billing] Using MockPaymentProvider');
  } else {
    if (!hasStripeKeys()) {
      console.warn('[Billing] Stripe mode enabled (no publishable key set; this is OK for Checkout redirect flow)');
    }
    console.log('[Billing] Using StripePaymentProvider');
  }

  return {
    provider,
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined,
    mockModeEnabled,
  };
}

export const billingConfig = getBillingConfig();
