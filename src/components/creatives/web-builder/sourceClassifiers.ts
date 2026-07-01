/**
 * Source-classification & small utility helpers extracted from WebBuilder.tsx
 * as part of Pass 5 decomposition. Pure functions only — no React, no I/O
 * beyond localStorage in getOrCreatePreviewBusinessId.
 */

import { generateUUID } from '@/utils/uuid';

/** True when the Supabase error indicates `business_installs` table missing. */
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

/** Stable per-systemType preview business id, cached in localStorage. */
export function getOrCreatePreviewBusinessId(systemType?: string): string {
  const key = systemType
    ? `webbuilder_businessId:${systemType}`
    : 'webbuilder_businessId';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = generateUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return generateUUID();
  }
}

/** True when the source is the built-in "welcome to builder" placeholder. */
export function isBuilderBootstrapPreviewCode(code: string): boolean {
  return /Welcome to AI Web Builder|AI-generated code will appear here|Use the AI Code Assistant to generate components/.test(
    code,
  );
}

/** True when the source is a canonical react-router App.tsx. */
export function isCanonicalRouterSource(code: string): boolean {
  return /react-router-dom|<Routes\b|<Route\b|HashRouter|BrowserRouter|createBrowserRouter/.test(
    code,
  );
}

/** True when the source is a wizard fallback / router-only stub. */
export function isWizardFallbackOrRouterOnlySource(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;
  if (isBuilderBootstrapPreviewCode(trimmed)) return true;
  if (isCanonicalRouterSource(trimmed)) return true;
  if (
    /Generating page content|This page is ready to be edited|A refined launch page ready for your next edit|New site preview/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}
