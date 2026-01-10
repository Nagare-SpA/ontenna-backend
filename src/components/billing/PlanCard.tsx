import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Plan, PlanTier } from '@/services/billing';

interface PlanCardProps {
  plan: Plan;
  currentTier: PlanTier;
  isProcessing: boolean;
  billingPeriod: 'monthly' | 'yearly';
  onSubscribe: (planId: string) => void;
}

export function PlanCard({ 
  plan, 
  currentTier, 
  isProcessing, 
  billingPeriod,
  onSubscribe 
}: PlanCardProps) {
  const isCurrentPlan = plan.tier === currentTier;
  const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquivalent = billingPeriod === 'yearly' ? Math.round(price / 12) : price;
  const isPopular = plan.tier === 'pro';

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(cents / 100);
  };

  return (
    <Card className={cn(
      'relative flex flex-col',
      isPopular && 'border-primary shadow-lg',
      isCurrentPlan && 'ring-2 ring-primary'
    )}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {plan.name}
          {isCurrentPlan && (
            <Badge variant="secondary">Current</Badge>
          )}
        </CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">
            {formatPrice(monthlyEquivalent)}
          </span>
          <span className="text-muted-foreground">/month</span>
          {billingPeriod === 'yearly' && price > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Billed {formatPrice(price)} yearly (save 17%)
            </p>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : (isPopular ? 'default' : 'secondary')}
          disabled={isCurrentPlan || isProcessing}
          onClick={() => onSubscribe(plan.id)}
        >
          {isCurrentPlan ? 'Current Plan' : plan.tier === 'free' ? 'Downgrade' : 'Subscribe'}
        </Button>
      </CardFooter>
    </Card>
  );
}
