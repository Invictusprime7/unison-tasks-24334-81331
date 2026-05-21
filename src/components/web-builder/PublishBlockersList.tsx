/**
 * PublishBlockersList — Human-friendly remediation panel for PublishGate failures.
 *
 * Surfaces every blocker returned by PublishGate.evaluate(contract) and, for
 * capability-tied blockers, renders a deep-link CTA that asks the Creator
 * Playground to open its capability panel scoped to the relevant capabilityId.
 *
 * Mounted inside the DeployButton dialog as a publish-time pre-flight after
 * GateVerdictStrip, so creators see *why* the Deploy CTA is disabled and have
 * a one-click path to fix it.
 *
 * Communication contract: dispatches a `unison:open-capability-panel`
 * CustomEvent on window. The Creator Playground listens and routes the user.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { PublishGate, type CompiledContract, type GateReason } from '@/platform/core';

const CAPABILITY_LABEL: Record<string, string> = {
  commerce: 'commerce',
  auth: 'authentication',
  booking: 'booking',
  'lead-capture': 'lead capture',
  quoting: 'quoting',
  donation: 'donations',
};

interface PublishBlockersListProps {
  contract: CompiledContract | null;
  /**
   * Optional override; defaults to dispatching a window CustomEvent that the
   * Creator Playground capability panel can listen for. Tests/hosts can pass
   * a noop or a router push.
   */
  onOpenCapability?: (capabilityId: string) => void;
  className?: string;
}

function defaultOpenCapability(capabilityId: string) {
  try {
    window.dispatchEvent(
      new CustomEvent('unison:open-capability-panel', { detail: { capabilityId } }),
    );
  } catch {
    /* no-op in non-DOM envs */
  }
}

function remediationLabel(reason: GateReason): string | null {
  const cap = reason.meta?.capabilityId as string | undefined;
  if (!cap) return null;
  const label = CAPABILITY_LABEL[cap] ?? cap;
  switch (reason.code) {
    case 'critical-capability-stub':
      return `Enable ${label} capability`;
    case 'critical-capability-missing':
      return `Install ${label} handlers`;
    case 'critical-workflow-not-provisioned':
      return `Provision ${label} workflow`;
    default:
      return null;
  }
}

export const PublishBlockersList: React.FC<PublishBlockersListProps> = ({
  contract,
  onOpenCapability = defaultOpenCapability,
  className,
}) => {
  if (!contract) return null;
  const verdict = PublishGate.evaluate(contract);
  if (verdict.ok || verdict.reasons.length === 0) return null;

  return (
    <div
      className={
        'rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2 ' + (className ?? '')
      }
      role="alert"
      aria-label="Publish blockers"
    >
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {verdict.reasons.length} blocker{verdict.reasons.length === 1 ? '' : 's'} before publish
        </span>
      </div>
      <ul className="space-y-1.5">
        {verdict.reasons.map((reason, i) => {
          const cap = reason.meta?.capabilityId as string | undefined;
          const cta = remediationLabel(reason);
          return (
            <li key={i} className="flex items-start justify-between gap-2 text-xs">
              <div className="flex-1">
                <span className="opacity-90">{reason.message}</span>
                <span className="ml-1 opacity-50">[{reason.code}]</span>
              </div>
              {cta && cap && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-auto py-1 px-2 text-xs shrink-0"
                  onClick={() => onOpenCapability(cap)}
                >
                  {cta}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PublishBlockersList;
