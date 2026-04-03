import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Crown, Zap, Building2, Sparkles } from "lucide-react";
import { useSubscription, PlanType } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

const planIcons: Record<PlanType, React.ReactNode> = {
  free: <Zap className="h-3 w-3" />,
  pro: <Crown className="h-3 w-3" />,
  business: <Building2 className="h-3 w-3" />
};

const planColors: Record<PlanType, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary text-primary-foreground",
  business: "bg-secondary text-secondary-foreground"
};

export function SubscriptionBadge() {
  const navigate = useNavigate();
  const { subscription, loading, getLimits, getUsagePercentage } = useSubscription();

  if (loading || !subscription) return null;

  const limits = getLimits();
  const plan = subscription.plan;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="outline" 
          className={`cursor-pointer hover:opacity-80 transition-opacity ${planColors[plan]}`}
        >
          {planIcons[plan]}
          <span className="ml-1 capitalize">{plan}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2 px-0 pt-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {planIcons[plan]}
              <span className="capitalize">{plan} Plan</span>
            </CardTitle>
            <CardDescription>
              {plan === 'free' ? 'Upgrade for more features' : 'Your current subscription'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-4">
            {/* AI Generations */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI Generations
                </span>
                <span className="text-muted-foreground">
                  {subscription.ai_generations_used} / {limits.aiGenerations === Infinity ? '∞' : limits.aiGenerations}
                </span>
              </div>
              {limits.aiGenerations !== Infinity && (
                <Progress value={getUsagePercentage('ai')} className="h-2" />
              )}
            </div>

            {/* Projects */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Projects</span>
                <span className="text-muted-foreground">
                  {subscription.projects_count} / {limits.projects === Infinity ? '∞' : limits.projects}
                </span>
              </div>
              {limits.projects !== Infinity && (
                <Progress value={getUsagePercentage('projects')} className="h-2" />
              )}
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage</span>
                <span className="text-muted-foreground">
                  {subscription.storage_used_mb}MB / {limits.storageMb >= 1024 ? `${limits.storageMb / 1024}GB` : `${limits.storageMb}MB`}
                </span>
              </div>
              <Progress value={getUsagePercentage('storage')} className="h-2" />
            </div>

            {plan === 'free' && (
              <Button 
                className="w-full mt-4" 
                onClick={() => navigate('/pricing')}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
