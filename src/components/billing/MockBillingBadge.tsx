import { Badge } from '@/components/ui/badge';
import { TestTube2 } from 'lucide-react';
import { isMockBillingMode } from '@/services/billing';

export function MockBillingBadge() {
  if (!isMockBillingMode()) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5"
    >
      <TestTube2 className="h-3 w-3" />
      Mock Billing Mode – No real payments
    </Badge>
  );
}
