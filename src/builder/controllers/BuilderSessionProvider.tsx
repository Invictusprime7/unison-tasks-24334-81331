/**
 * BuilderSessionProvider — Phase A1 of the builder refactor.
 *
 * Single source of truth for the identity tuple that the entire builder
 * surface (WebBuilder, AIBuilderPanel, CreatorPlaygroundModal, downstream
 * controllers) needs to coordinate work:
 *
 *   - projectId      canonical project the user is editing (undefined in
 *                    "preview" mode before a draft is persisted)
 *   - businessId     owning business — drives RLS scoping
 *   - currentUserId  signed-in user, '' when anonymous preview
 *   - draftId        builder_drafts row id, when one has been resolved
 *   - sessionId      stable per-mount id used to correlate logs / telemetry
 *                    across controllers within a single builder session
 *
 * Phase A intentionally keeps this provider pure-additive: it does NOT
 * fetch data, does NOT poll, and does NOT subscribe to anything. It just
 * holds whatever the host component (today: WebBuilder) computes from the
 * route + launch state. Subsequent extractions (PreviewRuntimeController,
 * PageTopologyController, …) will consume this context instead of having
 * the values prop-drilled.
 *
 * Per project rules, custom hook files are prohibited. Consumers should
 * therefore call `useContext(BuilderSessionContext)` inline rather than
 * importing a `useBuilderSession()` hook.
 */

import { createContext, useMemo, type ReactNode } from 'react';
import type { UnisonRuntimeContext } from '@/platform/core/runtimeManifest';
import {
  assertProjectRuntimeEnvelope,
  projectRuntimeContext,
  type ProjectRuntimeEnvelope,
} from '@/types/projectRuntimeEnvelope';

export interface BuilderSessionValue {
  /** Durable project spine. Undefined only on legacy/unsaved entry paths. */
  projectRuntime: ProjectRuntimeEnvelope | undefined;
  /** Complete tenant identity when the canonical launch context is available. */
  runtimeContext: UnisonRuntimeContext | undefined;
  /** Canonical project id, or undefined while in unsaved preview mode. */
  projectId: string | undefined;
  /** Owning business id (may be a synthesized preview id). */
  businessId: string | undefined;
  /** Authenticated user id, '' if anonymous. */
  currentUserId: string;
  /** builder_drafts row id once resolved. */
  draftId: string | undefined;
  /** Stable per-mount session id for log correlation. */
  sessionId: string;
}

const DEFAULT_VALUE: BuilderSessionValue = {
  projectRuntime: undefined,
  runtimeContext: undefined,
  projectId: undefined,
  businessId: undefined,
  currentUserId: '',
  draftId: undefined,
  sessionId: 'builder-session:uninitialized',
};

export const BuilderSessionContext = createContext<BuilderSessionValue>(DEFAULT_VALUE);
BuilderSessionContext.displayName = 'BuilderSessionContext';

export interface BuilderSessionProviderProps {
  value: Omit<BuilderSessionValue, 'sessionId' | 'runtimeContext' | 'projectRuntime'> & {
    projectRuntime?: ProjectRuntimeEnvelope;
    runtimeContext?: UnisonRuntimeContext;
    sessionId?: string;
  };
  children: ReactNode;
}

/**
 * Stable random id generator for the per-mount session id. Crypto when
 * available, fallback to Math.random for non-secure contexts (preview iframe,
 * SSR snapshot, jsdom tests).
 */
function makeSessionId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `builder-session:${rand}`;
}

export function BuilderSessionProvider({ value, children }: BuilderSessionProviderProps) {
  // Memoize so child controllers can use the context value as a stable
  // dependency without re-rendering on every parent render.
  const resolved = useMemo<BuilderSessionValue>(
    () => {
      if (value.projectRuntime) assertProjectRuntimeEnvelope(value.projectRuntime);
      const runtimeContext = value.projectRuntime
        ? projectRuntimeContext(value.projectRuntime)
        : value.runtimeContext;
      return {
      projectRuntime: value.projectRuntime,
      runtimeContext,
      projectId: value.projectRuntime?.identity.projectId ?? value.projectId,
      businessId: value.projectRuntime?.identity.businessId ?? value.businessId,
      currentUserId: value.currentUserId,
      draftId: value.projectRuntime?.identity.draftId ?? value.draftId,
      sessionId: value.sessionId ?? makeSessionId(),
      };
    },
    [
      value.projectRuntime,
      value.runtimeContext,
      value.projectId,
      value.businessId,
      value.currentUserId,
      value.draftId,
      value.sessionId,
    ],
  );

  return (
    <BuilderSessionContext.Provider value={resolved}>{children}</BuilderSessionContext.Provider>
  );
}
