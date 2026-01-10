import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PlanCard } from './PlanCard';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { useBilling } from '@/hooks/useBilling';

interface PlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlansDialog({ open, onOpenChange }: PlansDialogProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { plans, currentTier, isProcessing, isMockMode, refreshSubscription } = useBilling();

  const handleSubscribe = (planId: string) => {
    // Show embedded checkout
    setSelectedPlanId(planId);
  };

  const handleBack = () => {
    setSelectedPlanId(null);
  };

  const handleCheckoutComplete = () => {
    // Refresh subscription and close dialog
    refreshSubscription();
    setSelectedPlanId(null);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedPlanId(null);
    }
    onOpenChange(newOpen);
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {selectedPlanId ? (
          // Embedded Checkout View
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-xl">
                    Subscribe to {selectedPlan?.name}
                  </DialogTitle>
                  <DialogDescription>
                    Complete your payment to activate your subscription
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <StripeEmbeddedCheckout 
              planId={selectedPlanId}
              billingPeriod={billingPeriod}
              onComplete={handleCheckoutComplete}
            />
          </>
        ) : (
          // Plan Selection View
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
