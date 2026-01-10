import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanCard } from './PlanCard';
import { MockBillingBadge } from './MockBillingBadge';
import { useBilling } from '@/hooks/useBilling';

interface PlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlansDialog({ open, onOpenChange }: PlansDialogProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { plans, currentTier, isProcessing, subscribe, isMockMode } = useBilling();

  const handleSubscribe = async (planId: string) => {
    const result = await subscribe(planId, billingPeriod);
    if (result.success && isMockMode) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
            <MockBillingBadge />
          </div>
          <DialogDescription>
            Select the plan that best fits your needs. Upgrade or downgrade anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mb-6">
          <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <span className="ml-1.5 text-xs text-primary">Save 17%</span>
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
