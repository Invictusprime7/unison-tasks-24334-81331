import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Blocks,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  FormInput,
  GitBranch,
  Globe,
  Inbox,
  LineChart,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { BusinessOSModuleCard } from "./BusinessOSModuleCard";
import { BusinessOSReadinessBar } from "./BusinessOSReadinessBar";
import {
  BUSINESS_OS_MODULE_ORDER,
  computeBusinessOSReadiness,
  type BusinessOSModuleId,
  type BusinessOSProfile,
} from "@/types/businessOS";

const MODULE_META: Record<BusinessOSModuleId, { label: string; icon: LucideIcon }> = {
  website: { label: "Website", icon: Globe },
  pages: { label: "Pages", icon: FileText },
  funnels: { label: "Funnels", icon: GitBranch },
  offers: { label: "Offers", icon: ShoppingBag },
  forms: { label: "Forms", icon: FormInput },
  crm: { label: "CRM", icon: Users },
  pipeline: { label: "Pipeline", icon: Workflow },
  bookings: { label: "Bookings", icon: Calendar },
  payments: { label: "Payments", icon: CreditCard },
  automations: { label: "Automations", icon: Workflow },
  inbox: { label: "Inbox", icon: Inbox },
  reviews: { label: "Reviews", icon: Star },
  analytics: { label: "Analytics", icon: LineChart },
  ai_operator: { label: "AI Operator", icon: Sparkles },
  settings: { label: "Settings", icon: Briefcase },
};

interface Props {
  profile: BusinessOSProfile;
  onOpenModule?: (id: BusinessOSModuleId) => void;
  moduleCounts?: Partial<Record<BusinessOSModuleId, number>>;
  className?: string;
}

export const BusinessOSOverview: React.FC<Props> = ({ profile, onOpenModule, moduleCounts, className }) => {
  const readiness = React.useMemo(() => computeBusinessOSReadiness(profile), [profile]);
  const enabledModules = BUSINESS_OS_MODULE_ORDER.filter((id) => profile.modules[id]?.enabled);

  return (
    <div className={cn("space-y-5", className)}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-emerald-400/70">Business OS</p>
          <h2 className="text-xl font-bold text-foreground">{profile.identity.businessName}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.identity.industry} · Goal: {profile.blueprint.capabilities.primaryGoal}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] uppercase tracking-wide",
            profile.status === "published"
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
              : profile.status === "preview"
                ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                : "border-border/40 text-muted-foreground",
          )}
        >
          {profile.status}
        </Badge>
      </header>

      <BusinessOSReadinessBar readiness={readiness} />

      <Card className="bg-card/40 border-border/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Blocks className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Modules
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {enabledModules.map((id) => {
            const meta = MODULE_META[id];
            return (
              <BusinessOSModuleCard
                key={id}
                label={meta.label}
                icon={meta.icon}
                state={profile.modules[id]}
                count={moduleCounts?.[id]}
                onClick={onOpenModule ? () => onOpenModule(id) : undefined}
              />
            );
          })}
        </div>
      </Card>

      <Card className="bg-card/40 border-border/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Recommended next actions
          </h3>
        </div>
        {profile.aiMemory.recommendedNextActions.length === 0 ? (
          <p className="text-xs text-muted-foreground">You're all caught up.</p>
        ) : (
          <ul className="space-y-1.5">
            {profile.aiMemory.recommendedNextActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                <span className="mt-0.5 h-4 w-4 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1">{action}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {readiness.blocked > 0 && (
        <Card className="bg-red-500/5 border-red-500/30 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
            Publish blockers
          </h3>
          <ul className="space-y-1.5">
            {readiness.blockers.map((b) => (
              <li key={b.moduleId} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-foreground/90">
                  <span className="font-semibold">{MODULE_META[b.moduleId].label}:</span>{" "}
                  {b.reasons.join(", ")}
                </span>
                {onOpenModule && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-red-300 hover:text-red-200 hover:bg-red-500/10"
                    onClick={() => onOpenModule(b.moduleId)}
                  >
                    Fix
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
