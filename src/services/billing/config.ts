// Billing configuration
//
// Stripe was removed from the project (2026-09-29): it was scaffolded by the
// Lovable template on day one and never processed a single payment — zero
// customers, zero subscriptions, zero webhook events. Access is granted
// manually today (see `subscriptions.free_until` /
// `personal_accounts.granted_free_until`), which is a separate mechanism and
// is untouched.
//
// The PaymentProvider abstraction is kept on purpose so a real provider
// (Stripe again, or Apple IAP) can be plugged back in without reworking the UI.

export type PaymentProviderType = 'mock';

interface BillingConfig {
  provider: PaymentProviderType;
  mockModeEnabled: boolean;
}

export function getBillingConfig(): BillingConfig {
  // No real payment provider is configured. MockPaymentProvider writes straight
  // to `subscriptions`, so it is only ever usable by a super_admin — RLS blocks
  // a normal user from writing that table. `MockBillingBadge` surfaces this in
  // the UI so nobody mistakes it for real billing.
  console.log('[Billing] No payment provider configured; using MockPaymentProvider');

  return {
    provider: 'mock',
    mockModeEnabled: true,
  };
}

export const billingConfig = getBillingConfig();
