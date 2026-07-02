/**
 * ConnectedBusinessStrip — A5
 *
 * Compact status strip the Web Builder mounts at the top of its shell to
 * make the "which business am I editing?" question answerable at a glance.
 *
 * Reads through `businessProfileService` only. Renders:
 *   - business name + industry chip
 *   - profile completeness percent
 *   - number of publish-blocking fields (if any) with a Fix button
 *
 * No mutation surface here — the Fix button opens BusinessCenterPanel.
 */

import { useEffect, useState } from 'react';
import { Building2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  loadBusinessProfile,
} from '@/services/businessProfileService';
import { evaluateBusinessProfileGate } from '@/services/businessProfileReadinessGate';
import type { BusinessProfileDTO } from '@/types/businessProfile';

export interface ConnectedBusinessStripProps {
  businessId: string | undefined;
  onOpenBusinessCenter?: () => void;
}

export function ConnectedBusinessStrip({
  businessId,
  onOpenBusinessCenter,
}: ConnectedBusinessStripProps) {
  const [profile, setProfile] = useState<BusinessProfileDTO | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!businessId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    loadBusinessProfile(businessId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (!businessId) return null;

  const verdict = evaluateBusinessProfileGate(profile);
  const blocking = verdict.reasons.length;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-xs">
      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium truncate max-w-[180px]">
        {loading ? 'Loading…' : profile?.name ?? 'Untitled business'}
      </span>
      {profile?.industry && (
        <span className="rounded-sm bg-background/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {profile.industry}
        </span>
      )}
      <span className="text-muted-foreground">•</span>
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : verdict.ok ? (
        <span className="flex items-center gap-1 text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ready ({verdict.percent}%)
        </span>
      ) : (
        <span className="flex items-center gap-1 text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          {blocking} to fix ({verdict.percent}%)
        </span>
      )}
      {onOpenBusinessCenter && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          onClick={onOpenBusinessCenter}
        >
          Business Center
        </Button>
      )}
    </div>
  );
}
