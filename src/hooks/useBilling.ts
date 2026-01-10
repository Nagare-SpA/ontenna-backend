import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentProvider, isMockBillingMode } from '@/services/billing';
import type { Plan, Subscription, PlanTier } from '@/services/billing';
import { useToast } from '@/hooks/use-toast';

export function useBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const isMockMode = isMockBillingMode();

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const fetchedPlans = await paymentProvider.getPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('[Billing] Error fetching plans:', error);
    }
  }, []);

  // Fetch subscription status
  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const sub = await paymentProvider.getSubscriptionStatus(user.id);
      setSubscription(sub);
    } catch (error) {
      console.error('[Billing] Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initialize
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Subscribe to a plan
  const subscribe = useCallback(async (planId: string, billingPeriod: 'monthly' | 'yearly' = 'monthly') => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to subscribe',
        variant: 'destructive'
      });
      return { success: false };
    }

    setIsProcessing(true);
    try {
      const result = await paymentProvider.createCheckoutSession(planId, user.id, billingPeriod);
      
      if (result.success) {
        if (result.sessionUrl) {
          // Stripe mode - redirect to checkout
          window.location.href = result.sessionUrl;
        } else {
          // Mock mode - instant success
          toast({
            title: 'Subscription Updated',
            description: 'Your subscription has been updated successfully.'
          });
          await fetchSubscription();
        }
        return { success: true };
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create subscription',
          variant: 'destructive'
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[Billing] Error subscribing:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
      return { success: false, error: 'Unexpected error' };
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, toast, fetchSubscription]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    if (!subscription?.id) {
      return { success: false, error: 'No active subscription' };
    }

    setIsProcessing(true);
    try {
      const result = await paymentProvider.cancelSubscription(subscription.id);
      
      if (result.success) {
        toast({
          title: 'Subscription Canceled',
          description: 'Your subscription will remain active until the end of the billing period.'
        });
        await fetchSubscription();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel subscription',
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (error) {
      console.error('[Billing] Error canceling subscription:', error);
      return { success: false, error: 'Unexpected error' };
    } finally {
      setIsProcessing(false);
    }
  }, [subscription?.id, toast, fetchSubscription]);

  // Resume subscription
  const resumeSubscription = useCallback(async () => {
    if (!subscription?.id) {
      return { success: false, error: 'No subscription to resume' };
    }

    setIsProcessing(true);
    try {
      const result = await paymentProvider.resumeSubscription(subscription.id);
      
      if (result.success) {
        toast({
          title: 'Subscription Resumed',
          description: 'Your subscription has been resumed.'
        });
        await fetchSubscription();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to resume subscription',
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (error) {
      console.error('[Billing] Error resuming subscription:', error);
      return { success: false, error: 'Unexpected error' };
    } finally {
      setIsProcessing(false);
    }
  }, [subscription?.id, toast, fetchSubscription]);

  // Open customer portal (or mock management page)
  const openCustomerPortal = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await paymentProvider.getCustomerPortalUrl(user.id);
      if (result.success && result.url) {
        if (result.url.startsWith('/')) {
          // Internal route (mock mode)
          window.location.href = result.url;
        } else {
          // External URL (Stripe portal)
          window.location.href = result.url;
        }
      }
    } catch (error) {
      console.error('[Billing] Error opening customer portal:', error);
    }
  }, [user?.id]);

  // Get current plan tier
  const currentTier: PlanTier = subscription?.plan?.tier || 'free';

  return {
    plans,
    subscription,
    currentTier,
    isLoading,
    isProcessing,
    isMockMode,
    subscribe,
    cancelSubscription,
    resumeSubscription,
    openCustomerPortal,
    refreshSubscription: fetchSubscription
  };
}
