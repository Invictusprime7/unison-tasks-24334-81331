import { describe, expect, it, vi } from 'vitest';

const { invoke, maybeSingle } = vi.hoisted(() => ({
  invoke: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  },
}));

import { provisionConfirmedLaunchSite } from '@/services/confirmedLaunchProvisioner';

const ids = {
  businessId: '11111111-1111-4111-8111-111111111111',
  siteId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
  draftId: '44444444-4444-4444-8444-444444444444',
  buildId: '55555555-5555-4555-8555-555555555555',
  bundleId: '66666666-6666-4666-8666-666666666666',
};

const shellInput = {
  ids,
  businessName: 'Northstar Studio',
  industry: 'agency',
  siteName: 'Northstar Studio Site',
  systemType: 'agency',
  themePresetId: 'modern',
};

describe('provisionConfirmedLaunchSite', () => {
  it('sends only the identity shell contract to the confirmed launch endpoint', async () => {
    invoke.mockResolvedValueOnce({ data: { data: ids }, error: null });
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: ids.draftId,
        project_id: ids.projectId,
        business_id: ids.businessId,
        site_id: ids.siteId,
        last_revision_id: null,
        vfs_files: {},
        metadata: {},
      },
      error: null,
    });

    await expect(provisionConfirmedLaunchSite(shellInput)).resolves.toEqual(ids);

    expect(invoke).toHaveBeenCalledWith('provision-launch-site', { body: shellInput });
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty('vfsFiles');
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty('siteBundleSnapshot');
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty('runtimeManifest');
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty('activePagePath');
  });

  it('rejects incomplete root identities instead of navigating to an unlinked project', async () => {
    invoke.mockResolvedValueOnce({ data: { data: { projectId: ids.projectId } }, error: null });

    await expect(provisionConfirmedLaunchSite(shellInput)).rejects.toThrow('incomplete site identity');
  });

  it('rejects a provisioning shell that contains VFS content before canonical commit', async () => {
    invoke.mockResolvedValueOnce({ data: { data: ids }, error: null });
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: ids.draftId,
        project_id: ids.projectId,
        business_id: ids.businessId,
        site_id: ids.siteId,
        last_revision_id: null,
        vfs_files: { '/src/App.tsx': 'export default function App() {}' },
        metadata: {},
      },
      error: null,
    });

    await expect(provisionConfirmedLaunchSite(shellInput)).rejects.toThrow('content outside the canonical commit pipeline');
  });

  it('accepts an empty shell without a pre-commit active page projection', async () => {
    invoke.mockResolvedValueOnce({ data: { data: ids }, error: null });
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: ids.draftId,
        project_id: ids.projectId,
        business_id: ids.businessId,
        site_id: ids.siteId,
        last_revision_id: null,
        vfs_files: {},
        metadata: {},
      },
      error: null,
    });

    await expect(provisionConfirmedLaunchSite(shellInput)).resolves.toEqual(ids);
  });
});