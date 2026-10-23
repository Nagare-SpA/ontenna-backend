import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { PlanCard } from './PlanCard';
import { useBilling } from '@/hooks/useBilling';

interface PlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlansDialog({ open, onOpenChange }: PlansDialogProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const {
    plans,
    currentTier,
    isProcessing,
    trialEligible,
    startTrial,
    subscribe,
    refreshSubscription,
  } = useBilling();

  // Yearly savings % derived from the (single) paid plan, so it stays accurate.
  const refPlan = plans.find((p) => p.priceMonthly > 0) ?? plans[0];
  const yearlySavePct = refPlan && refPlan.priceMonthly > 0
    ? Math.round((1 - refPlan.priceYearly / (refPlan.priceMonthly * 12)) * 100)
    : 0;

  const handleStartTrial = async () => {
    const result = await startTrial();
    if (result.success) {
      refreshSubscription();
      onOpenChange(false);
    }
  };

  // Stripe was removed (see src/services/billing/config.ts), so there is no
  // embedded payment sheet any more. `subscribe` goes through whatever provider
  // is configured; today that is MockPaymentProvider, which RLS restricts to
  // super_admins. Plug a real provider back in and this call keeps working.
  const handleSubscribe = async (planId: string) => {
    const result = await subscribe(planId, billingPeriod);
    if (result.success) {
      refreshSubscription();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-h-[92vh] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Select the plan that best fits your needs. Upgrade or downgrade anytime.
          </DialogDescription>
        </DialogHeader>

        {trialEligible && (
          <div className="mb-6 overflow-hidden rounded-xl border border-primary/40 bg-gradient-brand-soft p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="text-base font-semibold">Start with 1 month free</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full access to everything — no card required. Available once per account.
                </p>
              </div>
              <Button
                size="lg"
                className="shrink-0"
                onClick={handleStartTrial}
                disabled={isProcessing}
              >
                {isProcessing ? 'Starting…' : 'Start free trial'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                {yearlySavePct > 0 && (
                  <span className="ml-1.5 text-xs text-primary">Save {yearlySavePct}%</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentTier={currentTier}
              isProcessing={isProcessing}
              billingPeriod={billingPeriod}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
