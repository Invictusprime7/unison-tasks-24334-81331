import { describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

import {
  REQUIRED_SITE_CAPABILITIES,
  provisionConfirmedLaunchSite,
} from '@/services/confirmedLaunchProvisioner';

const ids = {
  businessId: '11111111-1111-4111-8111-111111111111',
  siteId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
  draftId: '44444444-4444-4444-8444-444444444444',
  buildId: '55555555-5555-4555-8555-555555555555',
  bundleId: '66666666-6666-4666-8666-666666666666',
};

describe('provisionConfirmedLaunchSite', () => {
  it('sends the complete live-site capability contract to the confirmed launch endpoint', async () => {
    invoke.mockResolvedValueOnce({ data: { data: ids }, error: null });

    await expect(provisionConfirmedLaunchSite({
      ids,
      businessName: 'Northstar Studio',
      industry: 'agency',
      siteName: 'Northstar Studio Site',
      systemType: 'agency',
      themePresetId: 'modern',
      code: 'export default function App() { return null; }',
      vfsFiles: { '/src/App.tsx': 'export default function App() { return null; }' },
      siteBundleSnapshot: {},
      runtimeManifest: {},
      wizardSelections: {},
    })).resolves.toEqual(ids);

    expect(invoke).toHaveBeenCalledWith('provision-launch-site', expect.objectContaining({
      body: expect.objectContaining({
        ids,
        capabilities: REQUIRED_SITE_CAPABILITIES,
      }),
    }));
  });

  it('rejects incomplete root identities instead of navigating to an unlinked project', async () => {
    invoke.mockResolvedValueOnce({ data: { data: { projectId: ids.projectId } }, error: null });

    await expect(provisionConfirmedLaunchSite({
      ids,
      businessName: 'Northstar Studio',
      industry: 'agency',
      siteName: 'Northstar Studio Site',
      systemType: 'agency',
      themePresetId: 'modern',
      code: 'export default function App() { return null; }',
      vfsFiles: { '/src/App.tsx': 'export default function App() { return null; }' },
      siteBundleSnapshot: {},
      runtimeManifest: {},
      wizardSelections: {},
    })).rejects.toThrow('incomplete site identity');
  });
});