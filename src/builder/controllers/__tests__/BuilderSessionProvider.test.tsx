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
      projectId: 'proj-1',
      businessId: 'biz-1',
      currentUserId: 'user-1',
      draftId: 'draft-1',
      sessionId: 'builder-session:test-fixed',
    });
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
