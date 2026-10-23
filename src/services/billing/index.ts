// Billing service - exports the payment provider based on configuration

import { billingConfig } from './config';
import { MockPaymentProvider } from './MockPaymentProvider';
import type { PaymentProvider } from './types';

// Export types
export * from './types';
export { billingConfig } from './config';

// Create and export the payment provider singleton.
// Stripe was removed; MockPaymentProvider is the only implementation left.
// See ./config.ts for why, and for how to plug a real provider back in.
function createPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}

export const paymentProvider = createPaymentProvider();

// Convenience function to check if in mock mode
export function isMockBillingMode(): boolean {
  return billingConfig.mockModeEnabled;
}
