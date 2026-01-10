import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionStatus } from '@/services/billing';

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
  'unpaid'
];

export function DevBillingControls() {
  const { user } = useAuth();
  const { subscription, plans, refreshSubscription, isMockMode } = useBilling();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Only show in mock mode
  if (!isMockMode) {
    return null;
  }

  const handleStatusChange = async (status: SubscriptionStatus) => {
    if (!subscription?.id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Subscription status changed to ${status}`
      });
      await refreshSubscription();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePlanChange = async (planId: string) => {
    if (!subscription?.id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan_id: planId })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: 'Plan Updated',
        description: 'Subscription plan changed successfully'
      });
      await refreshSubscription();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateSubscription = async (planId: string) => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Subscription Created',
        description: 'Mock subscription created successfully'
      });
      await refreshSubscription();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to create subscription',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!subscription?.id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: 'Subscription Deleted',
        description: 'Mock subscription removed'
      });
      await refreshSubscription();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subscription',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Dev Controls
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Developer Billing Controls
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Mock Mode</Badge>
          </DialogTitle>
          <DialogDescription>
            Simulate different subscription states for testing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {subscription ? (
            <>
              <div className="space-y-2">
                <Label>Current Status</Label>
                <Select 
                  value={subscription.status} 
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Plan</Label>
                <Select 
                  value={subscription.planId} 
                  onValueChange={handlePlanChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({plan.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleDeleteSubscription}
                disabled={isUpdating}
              >
                Delete Subscription (Reset to Free)
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Create Subscription</Label>
              <Select 
                onValueChange={handleCreateSubscription}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan to subscribe" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.tier !== 'free').map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                No active subscription. Select a plan to create one.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
