import { appRoutes, type AppRouteConfig, type RouteChrome, type RouteSection, type RouteShell } from "./routeConfig";
import { getRouteShellGroups } from "./routeShellModel";

export interface RouteInventorySummary {
  totalRoutes: number;
  shellCounts: Record<RouteShell, number>;
  chromeCounts: Record<RouteChrome, number>;
  sectionCounts: Record<RouteSection, number>;
  deprecatedAliasCount: number;
  authRequiredCount: number;
  workspaceRequiredCount: number;
  projectRequiredCount: number;
}

export interface RouteInventoryEntry {
  id: string;
  path: string;
  title: string;
  shell: RouteShell;
  chrome: RouteChrome;
  section: RouteSection;
  requiresAuth: boolean;
  requiresWorkspace: boolean;
  requiresProject: boolean;
  deprecatedAliasFor: string | null;
  primaryAction: string | null;
}

function incrementRecord<Key extends string>(record: Record<Key, number>, key: Key) {
  record[key] = (record[key] ?? 0) + 1;
}

export function getRouteInventoryEntries(routes: AppRouteConfig[] = appRoutes): RouteInventoryEntry[] {
  return routes.map((route) => ({
    id: route.meta.id,
    path: route.path,
    title: route.meta.title,
    shell: route.meta.shell,
    chrome: route.meta.chrome,
    section: route.meta.section,
    requiresAuth: route.meta.requiresAuth === true,
    requiresWorkspace: route.meta.requiresWorkspace === true,
    requiresProject: route.meta.requiresProject === true,
    deprecatedAliasFor: route.meta.deprecatedAliasFor ?? null,
    primaryAction: route.meta.primaryAction ?? null,
  }));
}

export function getRouteInventorySummary(routes: AppRouteConfig[] = appRoutes): RouteInventorySummary {
  const shellCounts = Object.fromEntries(
    getRouteShellGroups(routes).map((group) => [group.definition.shell, 0]),
  ) as Record<RouteShell, number>;

  const sectionCounts = {} as Record<RouteSection, number>;
  const chromeCounts = {
    none: 0,
    legacy: 0,
    canonical: 0,
    fullscreen: 0,
  } satisfies Record<RouteChrome, number>;
  let deprecatedAliasCount = 0;
  let authRequiredCount = 0;
  let workspaceRequiredCount = 0;
  let projectRequiredCount = 0;

  for (const route of routes) {
    incrementRecord(shellCounts, route.meta.shell);
    incrementRecord(chromeCounts, route.meta.chrome);
    incrementRecord(sectionCounts, route.meta.section);

    if (route.meta.deprecatedAliasFor) deprecatedAliasCount += 1;
    if (route.meta.requiresAuth) authRequiredCount += 1;
    if (route.meta.requiresWorkspace) workspaceRequiredCount += 1;
    if (route.meta.requiresProject) projectRequiredCount += 1;
  }

  return {
    totalRoutes: routes.length,
    shellCounts,
    chromeCounts,
    sectionCounts,
    deprecatedAliasCount,
    authRequiredCount,
    workspaceRequiredCount,
    projectRequiredCount,
  };
}

export function getDeprecatedRouteAliases(routes: AppRouteConfig[] = appRoutes) {
  return getRouteInventoryEntries(routes).filter((entry) => entry.deprecatedAliasFor);
}

export function getRoutesByChrome(chrome: RouteChrome, routes: AppRouteConfig[] = appRoutes) {
  return routes.filter((route) => route.meta.chrome === chrome);
}

export function getShellMigrationSummary(routes: AppRouteConfig[] = appRoutes) {
  const summary = getRouteInventorySummary(routes);
  const migratableRoutes = routes.filter((route) => route.meta.chrome === "legacy");
  const canonicalRoutes = routes.filter((route) => route.meta.chrome === "canonical");
  const fullscreenRoutes = routes.filter((route) => route.meta.chrome === "fullscreen");

  return {
    totalRoutes: summary.totalRoutes,
    canonicalCount: canonicalRoutes.length,
    legacyCount: migratableRoutes.length,
    fullscreenCount: fullscreenRoutes.length,
    noneCount: summary.chromeCounts.none,
    legacyRouteIds: migratableRoutes.map((route) => route.meta.id),
    canonicalRouteIds: canonicalRoutes.map((route) => route.meta.id),
    fullscreenRouteIds: fullscreenRoutes.map((route) => route.meta.id),
  };
}
