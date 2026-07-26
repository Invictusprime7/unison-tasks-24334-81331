import {
  CAPABILITY_REGISTRY,
  type BusinessCapability,
  type BusinessSystemState,
  type CapabilityApprovalRecord,
  type CapabilityDefinition,
  type CapabilityId,
} from '@/platform/core/capabilityRegistry';
import { emptyPatchPlan, type PatchPlan } from '@/types/patchPlan';

export type BuilderScope = 'website' | 'business-system' | 'developer';

export interface BuilderRequestEnvelope {
  requestId: string;
  prompt: string;
  scope: BuilderScope;
  context: {
    businessId?: string;
    projectId?: string;
    industry?: string;
    installedCapabilities?: CapabilityId[];
  };
}

export interface CapabilityIntentBinding {
  target: string;
  intent: string;
}

export type CapabilityPlanApproval = CapabilityApprovalRecord;

export interface CapabilityProposal {
  status: 'proposed' | 'approved';
  requiresApproval: true;
  approval?: CapabilityPlanApproval;
  summary: string;
  dataAffected: string[];
  operationalCapabilities: CapabilityId[];
  intentBindings: CapabilityIntentBinding[];
  readinessAssertions: string[];
}

export interface CapabilityPlan {
  envelope: BuilderRequestEnvelope;
  requestedCapabilities: BusinessCapability[];
  operationalCapabilities: CapabilityDefinition[];
  proposal: CapabilityProposal;
}

export interface ApprovedCapabilityPlan extends CapabilityPlan {
  proposal: CapabilityProposal & {
    status: 'approved';
    approval: CapabilityPlanApproval;
  };
}

const BOOKING_REQUEST = /\b(book|booking|appointment|schedule|availability|calendar)\b/i;
const SERVICE_REQUEST = /\b(service|services|treatment|treatments)\b/i;
const CONTACT_REQUEST = /\b(contact|lead|inquiry|enquiry|crm|customer)\b/i;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

const OPERATIONAL_PACKS: Record<BusinessCapability, CapabilityId[]> = {
  business_profile: [],
  'catalog.services': ['booking'],
  'catalog.products': ['commerce'],
  'catalog.menu': [],
  'crm.leads': ['lead-capture'],
  'crm.contacts': ['contact'],
  'booking.appointments': ['booking'],
  'commerce.cart': ['commerce'],
  'commerce.checkout': ['commerce'],
  'forms.contact': ['contact'],
  'forms.quote': ['quoting'],
  'auth.customer': ['auth'],
  'portal.customer': ['auth'],
  'automation.follow_up': ['lead-capture'],
  'notifications.email': [],
};

function resolveOperationalCapabilities(requested: BusinessCapability[]): CapabilityId[] {
  const selected = new Set<CapabilityId>();
  for (const capability of requested) {
    OPERATIONAL_PACKS[capability].forEach((pack) => selected.add(pack));
  }

  const addDependencies = (capabilityId: CapabilityId): void => {
    for (const dependency of CAPABILITY_REGISTRY[capabilityId].dependencies) {
      if (selected.has(dependency)) continue;
      selected.add(dependency);
      addDependencies(dependency);
    }
  };
  for (const capabilityId of [...selected]) addDependencies(capabilityId);
  return [...selected];
}

/**
 * Converts a business request into a reviewable plan. This function is pure:
 * it neither applies migrations nor invokes Edge Functions.
 */
export function planBusinessCapabilities(envelope: BuilderRequestEnvelope): CapabilityPlan {
  const prompt = envelope.prompt;
  const isBookingRequest = BOOKING_REQUEST.test(prompt);
  const requested = new Set<BusinessCapability>();

  if (isBookingRequest) {
    requested.add('business_profile');
    requested.add('catalog.services');
    requested.add('booking.appointments');
    requested.add('crm.contacts');
    requested.add('notifications.email');
  }
  if (SERVICE_REQUEST.test(prompt)) requested.add('catalog.services');
  if (CONTACT_REQUEST.test(prompt)) {
    requested.add('crm.contacts');
    requested.add('forms.contact');
  }

  const requestedCapabilities = [...requested];
  const operationalCapabilityIds = resolveOperationalCapabilities(requestedCapabilities);
  const operationalCapabilities = operationalCapabilityIds.map((id) => CAPABILITY_REGISTRY[id]);
  const isSalonBooking = isBookingRequest && /\b(salon|spa|stylist|beauty)\b/i.test(prompt + ` ${envelope.context.industry ?? ''}`);
  const intentBindings = isBookingRequest
    ? [{ target: 'service-card.primary-action', intent: 'booking.create' }]
    : [];
  const dataAffected = unique(operationalCapabilities.flatMap((capability) => capability.database.requiredTables));
  const readinessAssertions = unique(operationalCapabilities.flatMap((capability) => capability.readiness.assertions));

  return {
    envelope,
    requestedCapabilities,
    operationalCapabilities,
    proposal: {
      status: 'proposed',
      requiresApproval: true,
      summary: isSalonBooking
        ? 'Booking system required for this salon. It will configure services, staff availability, customer records, booking confirmations, and service booking actions.'
        : `Business capability changes required: ${requestedCapabilities.join(', ') || 'none detected'}.`,
      dataAffected,
      operationalCapabilities: operationalCapabilityIds,
      intentBindings,
      readinessAssertions,
    },
  };
}

/** Stamps a review decision; callers must provide the identity and time. */
export function approveCapabilityPlan(
  plan: CapabilityPlan,
  approval: CapabilityPlanApproval,
): ApprovedCapabilityPlan {
  if (!approval.approvedBy.trim()) {
    throw new Error('Capability plan approval requires an approver identity.');
  }
  if (Number.isNaN(Date.parse(approval.approvedAt))) {
    throw new Error('Capability plan approval requires a valid approval timestamp.');
  }

  return {
    ...plan,
    proposal: {
      ...plan.proposal,
      status: 'approved',
      approval,
    },
  };
}

/**
 * Creates the backend half of a capability transaction. The adapter refuses
 * proposed plans so no caller can accidentally provision infrastructure before
 * the user has reviewed and approved its data impact.
 */
export function approvedCapabilityPlanToPatchPlan(plan: CapabilityPlan): PatchPlan {
  if (plan.proposal.status !== 'approved' || !plan.proposal.approval) {
    throw new Error('Capability plan must be explicitly approved before execution.');
  }

  const patch = emptyPatchPlan(plan.proposal.summary);
  const approval = plan.proposal.approval;
  patch.businessSystem = {
    version: '1.0',
    requestedCapabilities: plan.requestedCapabilities,
    capabilities: plan.operationalCapabilities.map((capability) => ({
      id: capability.id,
      provides: capability.provides.filter((provided) => plan.requestedCapabilities.includes(provided)),
      status: 'approved',
      approval,
    })),
  } satisfies BusinessSystemState;
  for (const capability of plan.proposal.operationalCapabilities) {
    patch.backendOps.push({
      type: 'requireCapability',
      capability,
      payload: { approval },
    });
  }
  for (const capability of plan.proposal.operationalCapabilities) {
    patch.backendOps.push({
      type: 'seedCapability',
      capability,
      payload: { approval },
    });
  }
  return patch;
}