import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const SubscriptionBanner = () => {
  const { subscribed, loading, subscriptionEnd, createCheckout, openCustomerPortal } = useSubscription();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Checking subscription status...</span>
        </div>
      </Card>
    );
  }

  if (subscribed) {
    return (
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Premium Member</p>
              {subscriptionEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews on {new Date(subscriptionEnd).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={openCustomerPortal}
            variant="outline"
            size="sm"
          >
            Manage Subscription
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Upgrade to Premium</p>
            <p className="text-xs text-muted-foreground">$49/month - Unlock all features</p>
          </div>
        </div>
        <Button
          onClick={createCheckout}
          className="bg-primary hover:bg-primary/90"
          size="sm"
        >
          Subscribe Now
        </Button>
      </div>
    </Card>
  );
};
