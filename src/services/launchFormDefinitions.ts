import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

export type PublicFormIntent =
  | 'contact.submit'
  | 'quote.request'
  | 'booking.request'
  | 'newsletter.subscribe'
  | 'application.submit';

export interface PlannedFormDefinition {
  externalId: PublicFormIntent;
  name: string;
  intent: PublicFormIntent;
  fields: Array<{ name: string; required: boolean }>;
}

const GENERATED_FORM_DEFINITIONS: readonly PlannedFormDefinition[] = [
  { externalId: 'contact.submit', name: 'Contact request', intent: 'contact.submit', fields: [] },
  { externalId: 'quote.request', name: 'Quote request', intent: 'quote.request', fields: [] },
  { externalId: 'booking.request', name: 'Booking request', intent: 'booking.request', fields: [] },
  { externalId: 'newsletter.subscribe', name: 'Newsletter subscription', intent: 'newsletter.subscribe', fields: [] },
  { externalId: 'application.submit', name: 'Application', intent: 'application.submit', fields: [] },
];

/**
 * Standard generated forms use `data-demo-form`. Only emit definitions when
 * the canonical VFS contains that marker; the form runtime uses the intent as
 * its stable external id, so there is no client-controlled definition lookup.
 */
export function planLaunchFormDefinitions(
  siteBundleSnapshot: Pick<SiteBundleSnapshot, 'vfsFiles'> | undefined,
): PlannedFormDefinition[] {
  const hasGeneratedForm = Object.values(siteBundleSnapshot?.vfsFiles ?? {})
    .some((source) => source.includes('data-demo-form="true"'));

  return hasGeneratedForm ? GENERATED_FORM_DEFINITIONS.map((definition) => ({ ...definition })) : [];
}