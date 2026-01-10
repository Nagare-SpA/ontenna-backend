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
  
  if (envProvider === 'stripe') {
    return 'stripe';
  }
  
  // Default to mock mode
  return 'mock';
}

// Check if Stripe keys are available
function hasStripeKeys(): boolean {
  // Stripe keys would be in edge functions, not client-side
  // This is just for client-side check of publishable key
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
      console.warn('[Billing] Stripe disabled – missing keys, falling back to mock mode');
    } else {
      console.log('[Billing] Using StripePaymentProvider');
    }
  }
  
  return {
    provider: mockModeEnabled ? 'mock' : (hasStripeKeys() ? 'stripe' : 'mock'),
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined,
    mockModeEnabled
  };
}

export const billingConfig = getBillingConfig();
