/**
 * Native Publish Readiness
 *
 * Builds a deterministic PlaygroundSetupSnapshot and a publish-readiness
 * manifest for Unison's native first-party publish path (no third-party
 * provider required). This is the source of truth that the launcher hands to
 * WebBuilder/CreatorPlayground so the booking/contact preview already counts
 * as publish-ready when the owner email is known.
 *
 * Wired with Unison Tasks:
 *   - Snapshot feeds resolvePlaygroundControlPlane via setupSnapshot.setupSteps
 *   - Manifest is persisted into /.unison/launch-readiness.json so the in-VFS
 *     setup wizard + intent inspector see the same state as the launcher.
 */

import type {
  PlaygroundSetupSnapshot,
  PlaygroundSetupStepSnapshot,
  PlaygroundState,
} from '@/platform/core/playground';
import { getIndustryIntentProfile } from '@/platform/core/industryIntentProfiles';

export type NativeSetupStepId =
  | 'database'
  | 'notifications'
  | 'booking_calendar'
  | 'payments';

export interface BuildNativePublishSetupSnapshotInput {
  enabled: boolean;
  ownerEmail?: string;
  businessName?: string;
  businessId?: string;
  systemType?: string | null;
}

export interface BuildNativePublishReadinessManifestInput {
  state: PlaygroundState;
  validations?: unknown;
  setupSnapshot?: PlaygroundSetupSnapshot;
  enabled: boolean;
  systemType?: string | null;
  /** Industry overlay (e.g. 'salon') used to verify required intents are bound. */
  industryOverlay?: string | null;
}

const completed = (): PlaygroundSetupStepSnapshot['status'] => 'completed';
const skipped = (): PlaygroundSetupStepSnapshot['status'] => 'skipped';
const pending = (): PlaygroundSetupStepSnapshot['status'] => 'pending';

/**
 * Build a PlaygroundSetupSnapshot that represents Unison's first-party
 * publish path. Returns `undefined` when native mode is disabled so the
 * caller can fall back to its default cloud-state snapshot.
 */
export function buildNativePublishSetupSnapshot(
  input: BuildNativePublishSetupSnapshotInput,
): PlaygroundSetupSnapshot | undefined {
  if (!input.enabled) return undefined;

  const normalizedEmail = (input.ownerEmail || '').trim();
  const hasEmail = normalizedEmail.includes('@');
  const isBooking = input.systemType === 'booking';

  const steps: PlaygroundSetupStepSnapshot[] = [
    {
      id: 'database',
      status: completed(),
      config: {
        provider: 'unison-native',
        destination: 'unison_crm',
        autoProvisioned: true,
        businessId: input.businessId || null,
      },
    },
    {
      id: 'notifications',
      status: hasEmail ? completed() : pending(),
      config: {
        provider: 'unison-native-email',
        notificationEmail: hasEmail ? normalizedEmail : null,
        autoProvisioned: hasEmail,
      },
    },
    {
      id: 'booking_calendar',
      status: isBooking ? completed() : skipped(),
      config: {
        provider: 'unison-native-booking-requests',
        bookingOwner: hasEmail ? normalizedEmail : null,
        businessDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        opensAt: '09:00',
        closesAt: '17:00',
        autoProvisioned: true,
      },
    },
    {
      id: 'payments',
      status: skipped(),
      config: {
        reason: 'No payment provider required for native booking/contact publish path.',
        autoProvisioned: true,
      },
    },
  ];

  return {
    publishStatus: hasEmail ? 'ready' : 'pending',
    customDomain: null,
    notificationEmail: hasEmail ? normalizedEmail : null,
    projectName: input.businessName || null,
    setupSteps: steps,
  };
}

/**
 * Build a JSON-serializable readiness manifest. This is the same surface the
 * in-Builder Intent Inspector + Launch Health pill consume to decide whether
 * the site can publish without further wiring.
 */
export function buildNativePublishReadinessManifest(
  input: BuildNativePublishReadinessManifestInput,
): Record<string, unknown> {
  const bindings = input.state?.bindings || {};
  const bindingList = Object.values(bindings);
  const previewReady = bindingList.filter((b) => b.previewStatus === 'ready').length;
  const publishReady = bindingList.filter((b) => b.publishStatus === 'ready').length;
  const blocked = bindingList.filter((b) => b.publishStatus === 'blocked').length;

  const notificationStep = input.setupSnapshot?.setupSteps?.find((s) => s.id === 'notifications');
  const bookingStep = input.setupSnapshot?.setupSteps?.find((s) => s.id === 'booking_calendar');

  // Industry intent coverage — verifies the synthesis pass left no required
  // intent unbound and no forbidden intent leaked through.
  const profile = input.industryOverlay ? getIndustryIntentProfile(input.industryOverlay) : undefined;
  const boundIntents = new Set(bindingList.map((b) => b.coreIntent).filter(Boolean) as string[]);
  const unsatisfiedRequired = profile
    ? profile.required.filter((intent) => !boundIntents.has(intent))
    : [];
  const forbiddenLeaked = profile
    ? bindingList
        .filter((b) => b.coreIntent && profile.forbidden.includes(b.coreIntent))
        .map((b) => b.coreIntent as string)
    : [];
  const industryReady = !profile || (unsatisfiedRequired.length === 0 && forbiddenLeaked.length === 0);

  return {
    publishMode: input.enabled ? 'native-first-party' : 'manual-setup',
    systemType: input.systemType || null,
    industry: input.industryOverlay || null,
    enabled: Boolean(input.enabled),
    notificationsReady: notificationStep?.status === 'completed',
    bookingReady: bookingStep?.status === 'completed',
    industryReady,
    bindings: {
      total: bindingList.length,
      previewReady,
      publishReady,
      blocked,
    },
    industryIntentCoverage: profile
      ? {
          industry: profile.industry,
          requiredTotal: profile.required.length,
          requiredSatisfied: profile.required.length - unsatisfiedRequired.length,
          unsatisfiedRequired,
          forbiddenLeaked,
        }
      : null,
    setupSnapshot: input.setupSnapshot || null,
    validationsSummary: summarizeValidations(input.validations),
    generatedAt: new Date().toISOString(),
  };
}

function summarizeValidations(validations: unknown): Record<string, unknown> | null {
  if (!validations || typeof validations !== 'object') return null;
  const v = validations as Record<string, unknown>;
  const errors = Array.isArray(v.errors) ? v.errors.length : 0;
  const warnings = Array.isArray(v.warnings) ? v.warnings.length : 0;
  return { errors, warnings };
}
