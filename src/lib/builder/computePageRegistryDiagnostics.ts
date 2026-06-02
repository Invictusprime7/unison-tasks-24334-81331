/**
 * computePageRegistryDiagnostics — builds page-registry diagnostic items
 * from route conflicts, topology validation errors, and missing VFS files.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 20. Pure helper:
 * no React, no setState, no side effects. Caller passes the result to
 * diagnosticsAggregator.ingestUnisonDiagnostics(...).
 */

export interface PageRegistryDiagnosticItem {
  domain: 'page-registry';
  message: string;
  severity?: 'error' | 'warning';
  code?: string;
}

interface PageLike {
  filePath?: string | null;
  title?: string | null;
}

interface PageRegistryLike {
  pages: Record<string, PageLike>;
}

interface SitePlanLike {
  validationErrors?: string[] | null;
}

export interface ComputePageRegistryDiagnosticsInput {
  routeConflicts: string[];
  sitePlan: SitePlanLike | null | undefined;
  pageRegistry: PageRegistryLike;
  vfsFiles: Record<string, unknown>;
}

export function computePageRegistryDiagnostics({
  routeConflicts,
  sitePlan,
  pageRegistry,
  vfsFiles,
}: ComputePageRegistryDiagnosticsInput): PageRegistryDiagnosticItem[] {
  const items: PageRegistryDiagnosticItem[] = [];

  for (const conflict of routeConflicts) {
    items.push({
      domain: 'page-registry',
      message: `Duplicate route detected: "${conflict}" — multiple pages share the same path`,
      severity: 'error',
      code: 'ROUTE_CONFLICT',
    });
  }

  if (sitePlan?.validationErrors?.length) {
    for (const err of sitePlan.validationErrors) {
      items.push({
        domain: 'page-registry',
        message: err,
        severity: 'warning',
        code: 'TOPOLOGY_VALIDATION',
      });
    }
  }

  for (const page of Object.values(pageRegistry.pages)) {
    if (page.filePath && !vfsFiles[page.filePath]) {
      items.push({
        domain: 'page-registry',
        message: `Page "${page.title}" (${page.filePath}) is registered but missing from VFS`,
        severity: 'warning',
        code: 'MISSING_VFS_FILE',
      });
    }
  }

  return items;
}
