/**
 * Repair action registry (Milestone 4).
 *
 * Turns raw readiness blockers into plain-language, one-click fixes.
 * Consumed by ReadinessChecklist + publish modal + Business OS dashboard.
 */

import { SECTION_DATA_CONTRACTS, type SectionDataContract } from '@/services/catalog/sectionDataContracts';

export type RepairFix =
  | { type: 'route'; path: string }
  | { type: 'connector'; connectorId: string }
  | { type: 'callback'; id: string };

export interface RepairAction {
  id: string;
  label: string;              // Button copy
  headline: string;           // "Your Services section needs at least 3 services…"
  reason: string;             // Longer explanation shown as helper text
  severity: 'blocker' | 'warning';
  fix: RepairFix;
}

interface Signals {
  businessId?: string | null;
  businessName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notificationEmail?: string | null;
  publishDestination?: string | null;
  bookingConnected?: boolean;
  paymentsConnected?: boolean;
  emailDomainVerified?: boolean;
  /** Row counts per source table, populated by the readiness gate. */
  rowCounts?: Partial<Record<SectionDataContract['sourceTable'], number>>;
  /** Section types present in the current site topology. */
  sectionsInUse?: string[];
}

const BUSINESS_PROFILE_ROUTE = '/business/profile';

export function buildRepairActions(signals: Signals): RepairAction[] {
  const actions: RepairAction[] = [];

  if (!signals.businessName?.trim()) {
    actions.push({
      id: 'add-business-name',
      label: 'Add business name',
      headline: 'Add your business name so it can appear across your site.',
      reason: 'Header, footer, SEO title, and confirmation emails all use this.',
      severity: 'blocker',
      fix: { type: 'route', path: `${BUSINESS_PROFILE_ROUTE}#name` },
    });
  }

  if (!signals.phone?.trim()) {
    actions.push({
      id: 'add-business-phone',
      label: 'Add business phone',
      headline: 'Add a phone number visitors can call.',
      reason: 'Your contact and footer sections show this. Bookings use it as a fallback.',
      severity: 'warning',
      fix: { type: 'route', path: `${BUSINESS_PROFILE_ROUTE}#phone` },
    });
  }

  if (!signals.email?.trim()) {
    actions.push({
      id: 'add-business-email',
      label: 'Add business email',
      headline: 'Add a public email address for visitors.',
      reason: 'Contact forms display this and confirmation emails reference it.',
      severity: 'warning',
      fix: { type: 'route', path: `${BUSINESS_PROFILE_ROUTE}#email` },
    });
  }

  if (!signals.notificationEmail?.trim()) {
    actions.push({
      id: 'connect-notification-email',
      label: 'Connect notification email',
      headline: 'Choose where new leads and bookings should be emailed.',
      reason: 'Without this, you will not receive owner notifications when visitors submit forms.',
      severity: 'blocker',
      fix: { type: 'route', path: `${BUSINESS_PROFILE_ROUTE}#notifications` },
    });
  }

  // Per-section catalog checks
  const inUse = new Set(signals.sectionsInUse ?? []);
  for (const sectionType of inUse) {
    const contract = SECTION_DATA_CONTRACTS[sectionType];
    if (!contract) continue;
    const count = signals.rowCounts?.[contract.sourceTable] ?? 0;
    if (count >= contract.minRows) continue;
    const missing = contract.minRows - count;
    actions.push({
      id: `add-${contract.bindingIdPrefix}`,
      label: `Add ${contract.rowLabel}`,
      headline: `Your ${contract.friendlyName} section needs at least ${contract.minRows} ${contract.rowLabel}${contract.minRows === 1 ? '' : 's'} before publishing.`,
      reason: count === 0
        ? `Nothing to show yet. Add your first ${contract.rowLabel} to make this section real.`
        : `You have ${count}. Add ${missing} more.`,
      severity: contract.emptyState === 'hide-section' ? 'warning' : 'blocker',
      fix: { type: 'route', path: contract.editPath },
    });
  }

  if (signals.bookingConnected === false && inUse.has('BookingAvailability')) {
    actions.push({
      id: 'connect-booking',
      label: 'Connect booking',
      headline: 'Turn on bookings so visitors can request appointments.',
      reason: 'Your booking section needs an availability calendar wired to your business.',
      severity: 'blocker',
      fix: { type: 'route', path: '/business/availability' },
    });
  }

  if (signals.paymentsConnected === false && (inUse.has('PricingTable') || inUse.has('ProductGrid'))) {
    actions.push({
      id: 'connect-payments',
      label: 'Connect payments',
      headline: 'Connect a payment provider so visitors can check out.',
      reason: 'Stripe or Paddle is required to accept real payments on pricing and product sections.',
      severity: 'blocker',
      fix: { type: 'callback', id: 'open-payments-connector' },
    });
  }

  if (signals.emailDomainVerified === false) {
    actions.push({
      id: 'verify-email-domain',
      label: 'Verify email domain',
      headline: 'Verify your email sender domain to guarantee deliverability.',
      reason: 'Confirmation emails may fall back to a generic sender until this is verified.',
      severity: 'warning',
      fix: { type: 'route', path: '/business/notifications' },
    });
  }

  if (!signals.publishDestination) {
    actions.push({
      id: 'choose-publish-destination',
      label: 'Verify publish destination',
      headline: 'Choose where your site should go live.',
      reason: 'Pick a subdomain or connect your custom domain before publishing.',
      severity: 'blocker',
      fix: { type: 'route', path: '/business/publish' },
    });
  }

  return actions;
}

export function partitionRepairs(actions: RepairAction[]) {
  const blockers = actions.filter((a) => a.severity === 'blocker');
  const warnings = actions.filter((a) => a.severity === 'warning');
  return { blockers, warnings };
}
