import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBilling } from '@/hooks/useBilling';
import type { SubscriptionStatus } from '@/services/billing';

interface SubscriptionCardProps {
  onManageClick?: () => void;
}

const STATUS_CONFIG: Record<SubscriptionStatus, { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { icon: CheckCircle, label: 'Active', variant: 'default' },
  trialing: { icon: Clock, label: 'Trial', variant: 'secondary' },
  past_due: { icon: AlertCircle, label: 'Past Due', variant: 'destructive' },
  canceled: { icon: XCircle, label: 'Canceled', variant: 'outline' },
  incomplete: { icon: AlertCircle, label: 'Incomplete', variant: 'destructive' },
  incomplete_expired: { icon: XCircle, label: 'Expired', variant: 'destructive' },
  paused: { icon: Clock, label: 'Paused', variant: 'secondary' },
  unpaid: { icon: AlertCircle, label: 'Unpaid', variant: 'destructive' }
};

export function SubscriptionCard({ onManageClick }: SubscriptionCardProps) {
  const { t } = useTranslation();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { 
    subscription, 
    isLoading, 
    cancelSubscription,
    resumeSubscription,
    isProcessing
  } = useBilling();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("subscription.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActiveSubscription = subscription && subscription.status !== 'canceled';
  const statusConfig = subscription ? STATUS_CONFIG[subscription.status] : null;
  const StatusIcon = statusConfig?.icon || CreditCard;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    await cancelSubscription();
    setCancelDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("subscription.title")}
            </CardTitle>
          </div>
          <CardDescription>{t("subscription.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveSubscription && subscription ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{subscription.plan?.name || 'Subscription'}</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd 
                      ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                      : `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                    }
                  </p>
                </div>
                <Badge variant={statusConfig?.variant || 'secondary'} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig?.label || subscription.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                {subscription.cancelAtPeriodEnd ? (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={resumeSubscription}
                    disabled={isProcessing}
                  >
                    Resume Subscription
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCancelClick}
                    disabled={isProcessing}
                  >
                    Cancel Subscription
                  </Button>
                )}
                {onManageClick && (
                  <Button 
                    variant="default"
                    onClick={onManageClick}
                  >
                    {t("subscription.manageSubscription")}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline">No Plan</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("subscription.noSubscription")}
              </p>
              {onManageClick && (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={onManageClick}
                >
                  View Plans
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Canceling...' : 'Yes, Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
