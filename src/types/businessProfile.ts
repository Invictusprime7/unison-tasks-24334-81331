/**
 * BusinessProfileDTO — the single runtime shape for a live business profile.
 *
 * This is the source of truth that every consumer must load through:
 *   - Generated-site runtime (hero name, contact, hours, brand, footer)
 *   - Web Builder "Connected Business" context strip
 *   - Readiness gate (missing fields become publishBlocked reasons)
 *   - Catalog attachments (services/products carry businessId → profile)
 *
 * Columns on `public.businesses` are the primary store. Vertical-specific
 * extras land in `settings` until they prove stable enough to promote.
 */

export interface BusinessAddress {
  line1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface BusinessHoursEntry {
  day: WeekDay;
  open?: string;   // HH:mm 24h
  close?: string;  // HH:mm 24h
  closed?: boolean;
}

export type BusinessSocialLinks = Partial<
  Record<'instagram' | 'facebook' | 'x' | 'tiktok' | 'linkedin' | 'youtube' | 'website', string>
>;

export interface BusinessProfileDTO {
  businessId: string;
  ownerId: string;
  name: string;
  slug?: string | null;
  industry?: string | null;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  notificationEmail?: string | null;
  notificationPhone?: string | null;
  timezone: string;
  address: BusinessAddress;
  hours: BusinessHoursEntry[];
  socialLinks: BusinessSocialLinks;
  settings: Record<string, unknown>;
  updatedAt?: string;
}

// ────────────────────────────────────────────────────────────────────────
// Completeness scoring — feeds the readiness gate + Business Center UI.
// ────────────────────────────────────────────────────────────────────────

export type ProfileFieldStatus = 'complete' | 'missing' | 'recommended';

export interface ProfileFieldReport {
  key: keyof BusinessProfileDTO | 'address.line1' | 'hours' | 'socialLinks';
  label: string;
  status: ProfileFieldStatus;
  /** true when this field blocks publish for the given industry. */
  blocksPublish: boolean;
  /** true when this field blocks preview render (very rare). */
  blocksPreview?: boolean;
}

export interface ProfileCompletenessReport {
  percent: number;                   // 0..100
  missingRequired: ProfileFieldReport[];
  missingRecommended: ProfileFieldReport[];
  fields: ProfileFieldReport[];
}

const LOCAL_INDUSTRIES = new Set([
  'restaurant', 'salon', 'local-service', 'contractor', 'real-estate', 'fitness', 'automotive',
]);

const HOURS_REQUIRED_INDUSTRIES = new Set([
  'restaurant', 'salon', 'local-service', 'fitness',
]);

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

export function scoreProfileCompleteness(p: BusinessProfileDTO): ProfileCompletenessReport {
  const industry = (p.industry ?? '').toLowerCase();
  const needsAddress = LOCAL_INDUSTRIES.has(industry);
  const needsHours = HOURS_REQUIRED_INDUSTRIES.has(industry);

  const fields: ProfileFieldReport[] = [
    { key: 'name',              label: 'Business name',        status: isEmpty(p.name) ? 'missing' : 'complete',                    blocksPublish: true,  blocksPreview: true },
    { key: 'notificationEmail', label: 'Notification email',   status: isEmpty(p.notificationEmail) ? 'missing' : 'complete',       blocksPublish: true },
    { key: 'timezone',          label: 'Timezone',             status: isEmpty(p.timezone) || p.timezone === 'UTC' ? 'recommended' : 'complete', blocksPublish: false },
    { key: 'phone',             label: 'Public phone',         status: isEmpty(p.phone) ? (needsAddress ? 'missing' : 'recommended') : 'complete', blocksPublish: needsAddress },
    { key: 'email',             label: 'Public email',         status: isEmpty(p.email) ? 'recommended' : 'complete',               blocksPublish: false },
    { key: 'address.line1',     label: 'Address',              status: isEmpty(p.address?.line1) ? (needsAddress ? 'missing' : 'recommended') : 'complete', blocksPublish: needsAddress },
    { key: 'hours',             label: 'Business hours',       status: (p.hours ?? []).length === 0 ? (needsHours ? 'missing' : 'recommended') : 'complete', blocksPublish: needsHours },
    { key: 'logoUrl',           label: 'Logo',                 status: isEmpty(p.logoUrl) ? 'recommended' : 'complete',             blocksPublish: false },
    { key: 'brandColor',        label: 'Brand color',          status: isEmpty(p.brandColor) ? 'recommended' : 'complete',          blocksPublish: false },
    { key: 'tagline',           label: 'Tagline',              status: isEmpty(p.tagline) ? 'recommended' : 'complete',             blocksPublish: false },
    { key: 'description',       label: 'Description',          status: isEmpty(p.description) ? 'recommended' : 'complete',         blocksPublish: false },
    { key: 'socialLinks',       label: 'Social links',         status: isEmpty(p.socialLinks) ? 'recommended' : 'complete',         blocksPublish: false },
  ];

  const missingRequired = fields.filter((f) => f.status === 'missing');
  const missingRecommended = fields.filter((f) => f.status === 'recommended');
  const completeCount = fields.filter((f) => f.status === 'complete').length;
  const percent = Math.round((completeCount / fields.length) * 100);

  return { percent, missingRequired, missingRecommended, fields };
}
