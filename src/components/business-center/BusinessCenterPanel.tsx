/**
 * BusinessCenterPanel — A5
 *
 * Sheet-friendly panel where operators view/edit the live business profile
 * that powers every generated site. All reads/writes go through
 * `businessProfileService` (never raw supabase calls).
 *
 * Scope for this pass: universal profile fields only (name, tagline,
 * contact, address, brand). Vertical-specific extras (menu, service menu,
 * class calendar) attach in Track B.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  loadBusinessProfile,
  saveBusinessProfile,
  type BusinessProfilePatch,
} from '@/services/businessProfileService';
import { evaluateBusinessProfileGate } from '@/services/businessProfileReadinessGate';
import { buildRepairActions } from '@/services/readiness/repairActions';
import { ReadinessChecklist } from '@/components/business/ReadinessChecklist';
import type { BusinessProfileDTO } from '@/types/businessProfile';


export interface BusinessCenterPanelProps {
  businessId: string;
  onClose?: () => void;
}

export function BusinessCenterPanel({ businessId, onClose }: BusinessCenterPanelProps) {
  const [profile, setProfile] = useState<BusinessProfileDTO | null>(null);
  const [patch, setPatch] = useState<BusinessProfilePatch>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadBusinessProfile(businessId)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setPatch({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const merged: BusinessProfileDTO | null = useMemo(() => {
    if (!profile) return null;
    return { ...profile, ...patch } as BusinessProfileDTO;
  }, [profile, patch]);

  const verdict = evaluateBusinessProfileGate(merged);

  async function handleSave() {
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    const next = await saveBusinessProfile(businessId, patch);
    setSaving(false);
    if (!next) {
      toast.error('Could not save business profile.');
      return;
    }
    setProfile(next);
    setPatch({});
    toast.success('Business profile saved.');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading business…
      </div>
    );
  }
  if (!merged) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        No business profile found for this project.
      </div>
    );
  }

  const set = <K extends keyof BusinessProfilePatch>(key: K, value: BusinessProfilePatch[K]) =>
    setPatch((p) => ({ ...p, [key]: value }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Business Center</h2>
          <p className="text-sm text-muted-foreground">
            This profile powers every generated site, email, and receipt.
          </p>
        </div>
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
            verdict.ok
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          {verdict.ok ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {verdict.percent}% complete
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bc-name">Business name</Label>
          <Input
            id="bc-name"
            value={merged.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-industry">Industry</Label>
          <Input
            id="bc-industry"
            value={merged.industry ?? ''}
            onChange={(e) => set('industry', e.target.value)}
            placeholder="salon, restaurant, coaching…"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bc-tagline">Tagline</Label>
          <Input
            id="bc-tagline"
            value={merged.tagline ?? ''}
            onChange={(e) => set('tagline', e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bc-description">Description</Label>
          <Textarea
            id="bc-description"
            rows={3}
            value={merged.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-phone">Public phone</Label>
          <Input
            id="bc-phone"
            value={merged.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-email">Public email</Label>
          <Input
            id="bc-email"
            type="email"
            value={merged.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-notif-email">Notification email</Label>
          <Input
            id="bc-notif-email"
            type="email"
            value={merged.notificationEmail ?? ''}
            onChange={(e) => set('notificationEmail', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-website">Website</Label>
          <Input
            id="bc-website"
            value={merged.website ?? ''}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-brand">Brand color (HSL/hex)</Label>
          <Input
            id="bc-brand"
            value={merged.brandColor ?? ''}
            onChange={(e) => set('brandColor', e.target.value)}
            placeholder="#3B82F6"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bc-tz">Timezone</Label>
          <Input
            id="bc-tz"
            value={merged.timezone ?? 'UTC'}
            onChange={(e) => set('timezone', e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bc-addr">Address</Label>
          <Input
            id="bc-addr"
            value={merged.address?.line1 ?? ''}
            onChange={(e) =>
              set('address', { ...(merged.address ?? {}), line1: e.target.value })
            }
            placeholder="123 Main St, City, ST"
          />
        </div>
      </section>

      {!verdict.ok && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600">
          <div className="font-medium mb-1">To publish, complete:</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {verdict.reasons.map((r) => (
              <li key={r.code}>{r.message}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="flex items-center justify-end gap-2 border-t pt-4">
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || Object.keys(patch).length === 0}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save profile
        </Button>
      </footer>
    </div>
  );
}
