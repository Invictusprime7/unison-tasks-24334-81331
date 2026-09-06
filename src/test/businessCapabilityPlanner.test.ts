import { describe, expect, it } from 'vitest';
import {
  approveCapabilityPlan,
  approvedCapabilityPlanToPatchPlan,
  planBusinessCapabilities,
} from '@/services/businessCapabilityPlanner';

describe('planBusinessCapabilities', () => {
  it('turns a salon booking request into an approval-gated full-stack proposal', () => {
    const plan = planBusinessCapabilities({
      requestId: 'salon-booking',
      prompt: 'Add online booking to this salon. Let customers book the services displayed here.',
      scope: 'business-system',
      context: { industry: 'salon' },
    });

    expect(plan.proposal.requiresApproval).toBe(true);
    expect(plan.proposal.status).toBe('proposed');
    expect(plan.requestedCapabilities).toEqual(expect.arrayContaining([
      'business_profile',
      'catalog.services',
      'booking.appointments',
      'crm.contacts',
      'notifications.email',
    ]));
    // Dependency-first install order: `contact` is a dependency of `booking`.
    expect(plan.proposal.operationalCapabilities).toEqual(['contact', 'booking']);
    expect(plan.proposal.intentBindings).toContainEqual({
      target: 'service-card.primary-action',
      intent: 'booking.create',
    });
    expect(plan.proposal.dataAffected).toEqual(expect.arrayContaining([
      'services', 'staff', 'availability_slots', 'bookings', 'crm_contacts',
    ]));
    expect(plan.proposal.readinessAssertions).toContain('booking-rls-verified');
  });

  it('does not create backend operations until the proposal is explicitly approved', () => {
    const plan = planBusinessCapabilities({
      requestId: 'salon-booking',
      prompt: 'Add online booking to this salon.',
      scope: 'business-system',
      context: { industry: 'salon' },
    });

    expect(() => approvedCapabilityPlanToPatchPlan(plan)).toThrow(/explicitly approved/i);

    const approved = approveCapabilityPlan(plan, {
      approvedBy: 'user-123',
      approvedAt: '2026-07-25T23:00:00.000Z',
    });
    const patch = approvedCapabilityPlanToPatchPlan(approved);

    expect(patch.backendOps).toEqual([
      { type: 'requireCapability', capability: 'contact', payload: { approval: approved.proposal.approval } },
      { type: 'requireCapability', capability: 'booking', payload: { approval: approved.proposal.approval } },
      { type: 'seedCapability', capability: 'contact', payload: { approval: approved.proposal.approval } },
      { type: 'seedCapability', capability: 'booking', payload: { approval: approved.proposal.approval } },
    ]);
  });
});