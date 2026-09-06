/**
 * BuilderSessionProvider — Phase A1 unit tests.
 *
 * Verifies:
 *   1. Default context returns the safe uninitialized tuple.
 *   2. Provider passes through the identity tuple unchanged.
 *   3. Provider auto-generates a sessionId when none supplied, and the
 *      generated id stays stable across re-renders that don't change inputs.
 *   4. An explicit sessionId is honored (used by tests and by future
 *      cross-tab restore).
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useContext } from 'react';
import {
  BuilderSessionContext,
  BuilderSessionProvider,
  type BuilderSessionValue,
} from '../BuilderSessionProvider';
import type { ProjectRuntimeEnvelope } from '@/types/projectRuntimeEnvelope';

function Probe({ onValue }: { onValue: (v: BuilderSessionValue) => void }) {
  const value = useContext(BuilderSessionContext);
  onValue(value);
  return null;
}

describe('BuilderSessionProvider', () => {
  it('exposes a safe default tuple when no provider is mounted', () => {
    let captured: BuilderSessionValue | undefined;
    renderToStaticMarkup(<Probe onValue={(v) => (captured = v)} />);

    expect(captured).toBeDefined();
    expect(captured?.runtimeContext).toBeUndefined();
    expect(captured?.projectId).toBeUndefined();
    expect(captured?.businessId).toBeUndefined();
    expect(captured?.currentUserId).toBe('');
    expect(captured?.draftId).toBeUndefined();
    expect(captured?.sessionId).toBe('builder-session:uninitialized');
  });

  it('passes the identity tuple through to consumers', () => {
    let captured: BuilderSessionValue | undefined;
    renderToStaticMarkup(
      <BuilderSessionProvider
        value={{
          projectId: 'proj-1',
          businessId: 'biz-1',
          currentUserId: 'user-1',
          draftId: 'draft-1',
          sessionId: 'builder-session:test-fixed',
        }}
      >
        <Probe onValue={(v) => (captured = v)} />
      </BuilderSessionProvider>,
    );

    expect(captured).toEqual({
      runtimeContext: undefined,
      projectId: 'proj-1',
      businessId: 'biz-1',
      currentUserId: 'user-1',
      draftId: 'draft-1',
      sessionId: 'builder-session:test-fixed',
    });
  });

  it('exposes a complete canonical runtime context unchanged', () => {
    const runtimeContext = {
      workspaceId: 'org-1',
      organizationId: 'org-1',
      businessId: 'biz-1',
      projectId: 'proj-1',
      websiteId: 'site-1',
      siteId: 'site-1',
      snapshotId: 'snapshot-1',
      environment: 'builder' as const,
    };
    let captured: BuilderSessionValue | undefined;
    renderToStaticMarkup(
      <BuilderSessionProvider
        value={{
          runtimeContext,
          projectId: 'proj-1',
          businessId: 'biz-1',
          currentUserId: 'user-1',
          draftId: 'draft-1',
        }}
      >
        <Probe onValue={(v) => (captured = v)} />
      </BuilderSessionProvider>,
    );

    expect(captured?.runtimeContext).toEqual(runtimeContext);
  });

  it('uses the durable runtime envelope instead of conflicting navigation hints', () => {
    const runtimeContext = {
      workspaceId: 'workspace-1',
      businessId: 'business-1',
      projectId: 'project-1',
      websiteId: 'website-1',
      snapshotId: 'snapshot-1',
      environment: 'builder' as const,
    };
    const projectRuntime = {
      version: '1.0',
      identity: {
        workspaceId: 'workspace-1',
        businessId: 'business-1',
        projectId: 'project-1',
        draftId: 'draft-1',
      },
      snapshot: {
        snapshotId: 'snapshot-1',
        vfsFiles: { '/src/App.tsx': 'export default function App() { return null; }' },
        appContext: { runtimeContext },
      },
      snapshotVersion: 'snapshot-1',
      revisionId: 'revision-1',
      activePublishedRevisionId: null,
      navigation: { activePagePath: '/src/App.tsx' },
      runtimeMode: 'draft',
      provisionedCapabilities: [],
      persistence: { status: 'persisted', persistedAt: null, error: null },
      synchronization: { status: 'synchronized', synchronizedAt: null, error: null },
    } as unknown as ProjectRuntimeEnvelope;
    let captured: BuilderSessionValue | undefined;

    renderToStaticMarkup(
      <BuilderSessionProvider
        value={{
          projectRuntime,
          projectId: 'route-project',
          businessId: 'route-business',
          currentUserId: 'user-1',
          draftId: 'route-draft',
        }}
      >
        <Probe onValue={(value) => (captured = value)} />
      </BuilderSessionProvider>,
    );

    expect(captured?.projectId).toBe('project-1');
    expect(captured?.businessId).toBe('business-1');
    expect(captured?.draftId).toBe('draft-1');
    expect(captured?.runtimeContext).toEqual(runtimeContext);
  });

  it('auto-generates a sessionId with the builder-session: prefix when omitted', () => {
    let captured: BuilderSessionValue | undefined;
    renderToStaticMarkup(
      <BuilderSessionProvider
        value={{
          projectId: undefined,
          businessId: undefined,
          currentUserId: '',
          draftId: undefined,
        }}
      >
        <Probe onValue={(v) => (captured = v)} />
      </BuilderSessionProvider>,
    );

    expect(captured?.sessionId).toMatch(/^builder-session:/);
    expect(captured?.sessionId).not.toBe('builder-session:uninitialized');
  });
});
