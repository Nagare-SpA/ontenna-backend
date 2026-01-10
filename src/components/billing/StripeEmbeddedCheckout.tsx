import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripeEmbeddedCheckoutProps {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  onComplete?: () => void;
}

export function StripeEmbeddedCheckout({ 
  planId, 
  billingPeriod,
  onComplete 
}: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        planId,
        billingPeriod,
        embedded: true,
        successUrl: `${window.location.origin}/dashboard?checkout=success`,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    return data.clientSecret;
  }, [planId, billingPeriod]);

  const options = {
    fetchClientSecret,
    onComplete,
  };

  return (
    <div id="checkout" className="min-h-[400px]">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
