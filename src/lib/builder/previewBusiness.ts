/**
 * previewBusiness — preview-only business id helpers.
 *
 * Extracted from WebBuilder.tsx (Phase C2). Pure functions, no React deps.
 * The WebBuilder needs a stable business id when previewing a system that
 * hasn't been provisioned yet; we mint one per `systemType` and persist in
 * localStorage so subsequent loads reuse the same id.
 */

import { generateUUID } from '@/utils/uuid';

/**
 * Detect Supabase errors that mean the `business_installs` table or row
 * isn't there yet — we treat those as "preview business not provisioned"
 * instead of surfacing a hard error in the Builder.
 */
export function isMissingBusinessInstallsError(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    status?: number;
    message?: string;
    details?: string;
  } | null;
  const combined = [candidate?.message, candidate?.details]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    candidate?.code === '42P01' ||
    candidate?.code === 'PGRST205' ||
    candidate?.status === 404 ||
    combined.includes('business_installs')
  );
}

/**
 * Return a stable preview business id for the current systemType, minting
 * (and persisting) a new UUID the first time it's requested.
 */
export function getOrCreatePreviewBusinessId(systemType?: string): string {
  const key = systemType ? `webbuilder_businessId:${systemType}` : 'webbuilder_businessId';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = generateUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    // Fallback when localStorage is unavailable (SSR, sandboxed iframe, etc.)
    return generateUUID();
  }
}
