import { describe, expect, it } from 'vitest';
import { buildBusinessRuntimeContract } from '@/platform/core/businessRuntimeContract';
import type { BusinessProfileDTO } from '@/types/businessProfile';

const profile: BusinessProfileDTO = {
  businessId: 'business-1',
  ownerId: 'owner-1',
  name: 'Northstar Studio',
  industry: 'agency',
  notificationEmail: 'owner@northstar.test',
  timezone: 'America/New_York',
  address: {},
  hours: [],
  socialLinks: {},
  settings: {},
  updatedAt: '2026-07-28T12:00:00.000Z',
};

describe('buildBusinessRuntimeContract', () => {
  it('describes live profile and binding sources without copying mutable profile data', () => {
    const contract = buildBusinessRuntimeContract({
      businessId: profile.businessId,
      profile,
      snapshotId: 'snapshot-1',
      expectedBindingCount: 2,
      bindingsReady: true,
      generatedAt: '2026-07-28T13:00:00.000Z',
    });

    expect(contract).toMatchObject({
      version: '1.0',
      businessId: 'business-1',
      profile: {
        source: 'businesses',
        version: profile.updatedAt,
        publishReady: true,
      },
      dataBindings: {
        source: 'site_data_bindings',
        snapshotId: 'snapshot-1',
        expectedCount: 2,
        status: 'ready',
      },
    });
    expect(contract).not.toHaveProperty('profile.notificationEmail');
  });

  it('keeps incomplete local profiles launchable while recording publish blockers', () => {
    const contract = buildBusinessRuntimeContract({
      businessId: profile.businessId,
      profile: {
        ...profile,
        industry: 'local-service',
        notificationEmail: null,
      },
      snapshotId: 'snapshot-1',
      expectedBindingCount: 1,
    });

    expect(contract.profile.publishReady).toBe(false);
    expect(contract.profile.missingRequiredFields).toEqual(
      expect.arrayContaining(['notificationEmail', 'phone', 'address.line1']),
    );
    expect(contract.dataBindings.status).toBe('pending');
  });

  it('rejects a profile from another tenant', () => {
    expect(() => buildBusinessRuntimeContract({
      businessId: 'business-2',
      profile,
      snapshotId: 'snapshot-1',
      expectedBindingCount: 0,
    })).toThrow('must match the launch business');
  });
});