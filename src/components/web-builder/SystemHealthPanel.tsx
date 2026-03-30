/**
 * SystemHealthPanel — Contract-aware diagnostics panel
 * 
 * Consumes CompiledContract directly to show:
 * - Provisioning status per capability
 * - Slot binding coverage
 * - Route policy validation
 * - Intent coverage
 * - Publish/preview readiness
 */

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  Zap,
  Shield,
  ChevronRight,
  Database,
  Workflow,
  Route,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type CompiledContract,
  type ProvisioningStatus,
  isPreviewReady,
  isPublishReady,
} from '@/contracts';

// ============================================================================
// Props
// ============================================================================

interface SystemHealthPanelProps {
  /** The compiled contract — the ONLY input this panel accepts */
  contract: CompiledContract | null;
  onPublishCheck?: () => void;
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

const StatusIcon: React.FC<{ status: ProvisioningStatus }> = ({ status }) => {
  switch (status) {
    case 'provisioned': return <CheckCircle2 className="w-4 h-4 text-primary" />;
    case 'stub': return <AlertCircle className="w-4 h-4 text-accent-foreground" />;
    case 'missing': return <XCircle className="w-4 h-4 text-destructive" />;
  }
};

const StatusBadge: React.FC<{ status: ProvisioningStatus }> = ({ status }) => {
  switch (status) {
    case 'provisioned':
      return <Badge variant="default" className="text-[10px] px-1.5 py-0">Live</Badge>;
    case 'stub':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground">Stub</Badge>;
    case 'missing':
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Missing</Badge>;
  }
};

// ============================================================================
// Main Component
// ============================================================================

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({
  contract,
  onPublishCheck,
  className,
}) => {
  const previewReady = useMemo(() => contract ? isPreviewReady(contract) : false, [contract]);
  const publishReady = useMemo(() => contract ? isPublishReady(contract) : false, [contract]);

  const healthScore = useMemo(() => {
    if (!contract) return 0;
    const prov = contract.provisioningReport;
    const total = prov.provisioned + prov.stubbed + prov.missing;
    if (total === 0) return 100;
    return Math.round(((prov.provisioned + prov.stubbed * 0.5) / total) * 100);
  }, [contract]);

  const slotStats = useMemo(() => {
    if (!contract) return { total: 0, resolved: 0, fallback: 0 };
    const policy = contract.slotBindingPolicy;
    return {
      total: policy.resolved.length,
      resolved: policy.resolved.filter(r => r.source !== 'fallback').length,
      fallback: policy.resolved.filter(r => r.source === 'fallback').length,
    };
  }, [contract]);

  if (!contract) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="p-4 text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No compiled contract — select a system to view diagnostics</p>
        </CardContent>
      </Card>
    );
  }

  const { validation, provisioningReport, routePolicy } = contract;

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Contract Health
          </CardTitle>
          <Badge
            variant={publishReady ? "default" : previewReady ? "secondary" : "destructive"}
            className={cn("text-xs", publishReady && "bg-primary text-primary-foreground")}
          >
            {publishReady ? 'Publish Ready' : previewReady ? 'Preview Only' : 'Not Ready'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Provisioning Health</span>
            <span className="font-medium">{healthScore}%</span>
          </div>
          <Progress value={healthScore} className="h-2" />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Database className="w-4 h-4 text-primary mb-1" />
            <span className="text-xs font-medium">{contract.requiredTables.length}</span>
            <span className="text-[10px] text-muted-foreground">Tables</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Workflow className="w-4 h-4 text-primary mb-1" />
            <span className="text-xs font-medium">{contract.requiredWorkflows.length}</span>
            <span className="text-[10px] text-muted-foreground">Workflows</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Route className="w-4 h-4 text-primary mb-1" />
            <span className="text-xs font-medium">{routePolicy.routes.length}</span>
            <span className="text-[10px] text-muted-foreground">Routes</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Layers className="w-4 h-4 text-primary mb-1" />
            <span className="text-xs font-medium">{slotStats.total}</span>
            <span className="text-[10px] text-muted-foreground">Slots</span>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="flex gap-2">
          {validation.errors > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {validation.errors} error{validation.errors !== 1 ? 's' : ''}
            </Badge>
          )}
          {validation.warnings > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-accent text-accent-foreground">
              {validation.warnings} warning{validation.warnings !== 1 ? 's' : ''}
            </Badge>
          )}
          {validation.infos > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {validation.infos} info{validation.infos !== 1 ? 's' : ''}
            </Badge>
          )}
          {validation.errors === 0 && validation.warnings === 0 && (
            <Badge variant="default" className="text-[10px]">✓ Clean</Badge>
          )}
        </div>

        {/* Slot Binding Coverage */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm">CTA Slots</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            slotStats.fallback === 0 ? "text-primary" : "text-accent-foreground"
          )}>
            {slotStats.resolved}/{slotStats.total}
            {slotStats.fallback > 0 && (
              <span className="text-muted-foreground text-xs ml-1">({slotStats.fallback} fallback)</span>
            )}
          </span>
        </div>

        <Separator />

        {/* Capability Provisioning */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Capability Provisioning
          </h4>
          <ScrollArea className="h-[180px]">
            <div className="space-y-1">
              {provisioningReport.capabilities.map((cap) => (
                <div
                  key={cap.capabilityId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon status={cap.status} />
                    <span className="text-sm">{cap.capabilityName}</span>
                  </div>
                  <StatusBadge status={cap.status} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* Validation Issues */}
        {validation.issues.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Issues
            </h4>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1">
                {validation.issues.slice(0, 10).map((issue, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground p-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      issue.severity === 'error' ? 'bg-destructive' :
                      issue.severity === 'warning' ? 'bg-accent-foreground' : 'bg-muted-foreground'
                    )} />
                    <span className="truncate">{issue.message}</span>
                  </div>
                ))}
                {validation.issues.length > 10 && (
                  <p className="text-xs text-muted-foreground pl-4">
                    +{validation.issues.length - 10} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Action Button */}
        <Button
          className="w-full"
          disabled={!previewReady}
          onClick={onPublishCheck}
        >
          {publishReady
            ? 'Run Publish Checks'
            : previewReady
              ? 'Preview Ready — Install Backend to Publish'
              : 'Resolve Errors First'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default SystemHealthPanel;
