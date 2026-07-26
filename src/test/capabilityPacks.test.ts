import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_PACKS,
  getCapabilityPack,
  packAssertions,
  packForCapability,
  packFunctions,
  packSettings,
  packSlots,
  packTables,
  resolveCapabilityPacks,
} from '@/platform/core/capabilityPacks';
import { planBusinessCapabilities } from '@/services/businessCapabilityPlanner';

describe('capability pack contracts', () => {
  it('ships the four foundational packs', () => {
    expect(CAPABILITY_PACKS.map((p) => p.id)).toEqual([
      'business_profile',
      'catalog.services',
      'crm.leads',
      'booking.appointments',
    ]);
  });

  it('gives every pack a complete full-stack contract', () => {
    for (const pack of CAPABILITY_PACKS) {
      expect(pack.database.tables.length, `${pack.id} tables`).toBeGreaterThan(0);
      expect(pack.frontend.components.length, `${pack.id} components`).toBeGreaterThan(0);
      expect(pack.frontend.slots.length, `${pack.id} slots`).toBeGreaterThan(0);
      expect(pack.readiness.assertions.length, `${pack.id} assertions`).toBeGreaterThan(0);
      expect(pack.readiness.assertions.some((a) => a.blocking), `${pack.id} blocking`).toBe(true);

      for (const table of pack.database.tables) {
        expect(table.requiredColumns.length, `${pack.id}.${table.table} columns`).toBeGreaterThan(0);
        // Every table must be reachable via the Data API for the roles it serves.
        expect(table.grants.some((g) => g.role === 'service_role')).toBe(true);
        expect(table.grants.some((g) => g.role === 'authenticated')).toBe(true);
        if (table.publicRead) expect(table.grants.some((g) => g.role === 'anon' && g.privileges.includes('SELECT'))).toBe(true);
        if (table.publicInsert) expect(table.grants.some((g) => g.role === 'anon' && g.privileges.includes('INSERT'))).toBe(true);
        // Owner-scoped tables must declare the column RLS filters on.
        if (!table.publicRead) expect(table.ownershipColumn, `${table.table} ownership`).toBeTruthy();
      }
    }
  });

  it('resolves capability aliases to the owning pack', () => {
    expect(packForCapability('crm.contacts')?.id).toBe('crm.leads');
    expect(packForCapability('forms.contact')?.id).toBe('crm.leads');
    expect(packForCapability('commerce.checkout')).toBeNull();
    expect(getCapabilityPack('booking.appointments')?.name).toBe('Booking & Availability');
  });
});

describe('resolveCapabilityPacks', () => {
  it('installs dependencies before dependents', () => {
    const { order, unsupported } = resolveCapabilityPacks(['booking.appointments']);
    expect(order.map((p) => p.id)).toEqual([
      'business_profile',
      'catalog.services',
      'crm.leads',
      'booking.appointments',
    ]);
    expect(unsupported).toEqual([]);
  });

  it('does not duplicate a pack requested twice or reached via two paths', () => {
    const { order } = resolveCapabilityPacks(['catalog.services', 'crm.contacts', 'booking.appointments', 'business_profile']);
    const ids = order.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.indexOf('business_profile')).toBe(0);
  });

  it('reports capabilities that have no pack yet instead of failing', () => {
    const { order, unsupported } = resolveCapabilityPacks(['commerce.cart', 'catalog.services']);
    expect(unsupported).toEqual(['commerce.cart']);
    expect(order.map((p) => p.id)).toEqual(['business_profile', 'catalog.services']);
  });

  it('aggregates tables, slots, functions and settings across the pack set', () => {
    const { order } = resolveCapabilityPacks(['booking.appointments']);
    expect(packTables(order)).toEqual(expect.arrayContaining([
      'businesses', 'services', 'leads', 'crm_leads', 'crm_contacts', 'availability_slots', 'bookings',
    ]));
    expect(packSlots(order)).toContain('service-card.primary-action');
    expect(packFunctions(order)).toEqual(expect.arrayContaining(['create-lead', 'create-booking']));
    expect(packSettings(order).accountFields).toEqual(expect.arrayContaining([
      'business.notificationEmail', 'business.timezone',
    ]));
    // Assertion ids are unique even though packs share some checks.
    const ids = packAssertions(order).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('planner pack integration', () => {
  it('attaches dependency-ordered packs to a booking proposal', () => {
    const plan = planBusinessCapabilities({
      requestId: 'pack-booking',
      prompt: 'Let customers book appointments online',
      context: { industry: 'salon' },
    });

    expect(plan.proposal.packs).toEqual([
      'business_profile',
      'catalog.services',
      'crm.leads',
      'booking.appointments',
    ]);
    expect(plan.proposal.edgeFunctions).toContain('create-booking');
    expect(plan.proposal.dataAffected).toEqual(expect.arrayContaining(['businesses', 'availability_slots']));
    expect(plan.proposal.readinessAssertions).toContain('booking-handler-installed');
    expect(plan.bindableSlots).toContain('booking-form.submit');
    expect(plan.proposal.unsupportedCapabilities).toEqual([]);
  });

  it('proposes no packs for a styling-only request', () => {
    const plan = planBusinessCapabilities({
      requestId: 'style-only',
      prompt: 'Make the hero heading larger',
      context: {},
    });
    expect(plan.proposal.packs).toEqual([]);
    expect(plan.bindableSlots).toEqual([]);
  });
});
