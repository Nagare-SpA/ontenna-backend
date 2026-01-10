// Billing service - exports the payment provider based on configuration

import { billingConfig } from './config';
import { MockPaymentProvider } from './MockPaymentProvider';
import { StripePaymentProvider } from './StripePaymentProvider';
import type { PaymentProvider } from './types';

// Export types
export * from './types';
export { billingConfig } from './config';

// Create and export the payment provider singleton
function createPaymentProvider(): PaymentProvider {
  if (billingConfig.provider === 'stripe') {
    console.log('[Billing] Initializing StripePaymentProvider');
    return new StripePaymentProvider();
  }
  
  console.log('[Billing] Initializing MockPaymentProvider');
  return new MockPaymentProvider();
}

export const paymentProvider = createPaymentProvider();

// Convenience function to check if in mock mode
export function isMockBillingMode(): boolean {
  return billingConfig.mockModeEnabled;
}
