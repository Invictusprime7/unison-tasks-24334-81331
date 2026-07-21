/**
 * BuilderIdentity — the strict identity model that every mutation source
 * (System Launcher, AI Builder, Playground edits, fast paths, publish) must
 * carry. This exists to stop the historical drift where `templateId` got
 * passed as `projectId`, `draftId` was inferred from draft names, and AI
 * Builder, Web Builder, and Launcher each carried slightly different IDs.
 *
 * Read the architectural rationale at
 * mem://architecture/site-os/vfs-commit-service.
 */

export interface BuilderIdentity {
  /** Authenticated end-user (auth.uid()). */
  userId: string;
  /** Business that owns the site. */
  businessId: string;
  /** Persistent project row id (NOT a templateId, NOT a draft name). */
  projectId: string;
  /** builder_drafts.id — the working draft this commit belongs to. */
  draftId: string;
  /**
   * Current head revision id from `site_revisions`. May be the empty string
   * for the very first wizard commit (which creates revision 1).
   */
  revisionId: string;
  /** Browser session id — used for telemetry and recovery handoff only. */
  sessionId: string;
}

export class InvalidBuilderIdentityError extends Error {
  constructor(message: string, public readonly identity: Partial<BuilderIdentity>) {
    super(`[BuilderIdentity] ${message}`);
    this.name = 'InvalidBuilderIdentityError';
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Hard-asserts a `BuilderIdentity`. Throws on:
 *   - missing required fields
 *   - non-uuid userId / businessId / projectId / draftId
 *   - obvious aliasing (projectId === templateId-shaped strings)
 *
 * `revisionId` may be empty (first wizard commit). `sessionId` may be any
 * non-empty string.
 */
export function assertBuilderIdentity(
  identity: Partial<BuilderIdentity> | null | undefined,
  context = 'assertBuilderIdentity',
): asserts identity is BuilderIdentity {
  if (!identity) {
    throw new InvalidBuilderIdentityError(`${context}: identity is null/undefined`, {});
  }
  const required: Array<keyof BuilderIdentity> = [
    'userId',
    'businessId',
    'projectId',
    'draftId',
    'sessionId',
  ];
  for (const key of required) {
    const v = identity[key];
    if (typeof v !== 'string' || v.length === 0) {
      throw new InvalidBuilderIdentityError(
        `${context}: missing required field "${key}"`,
        identity,
      );
    }
  }
  for (const key of ['userId', 'businessId', 'projectId', 'draftId'] as const) {
    const v = identity[key];
    if (typeof v === 'string' && v.length > 0 && !isUuid(v)) {
      throw new InvalidBuilderIdentityError(
        `${context}: field "${key}" must be a UUID, got "${v}"`,
        identity,
      );
    }
  }
  // revisionId, when present, must be a UUID
  if (identity.revisionId && !isUuid(identity.revisionId)) {
    throw new InvalidBuilderIdentityError(
      `${context}: revisionId must be a UUID when set, got "${identity.revisionId}"`,
      identity,
    );
  }
}

/** Convenience: returns true / false without throwing. */
export function isValidBuilderIdentity(
  identity: Partial<BuilderIdentity> | null | undefined,
): identity is BuilderIdentity {
  try {
    assertBuilderIdentity(identity);
    return true;
  } catch {
    return false;
  }
}
