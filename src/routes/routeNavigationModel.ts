import { appRoutes, type AppRouteConfig, type RouteSection, type RouteShell } from "./routeConfig";
import { getNavigableRoutesForShell, getPrimaryRouteForShell } from "./routeShellModel";

export type RoutePathParams = Record<string, string | number | null | undefined>;

export interface RouteNavItem {
  id: string;
  label: string;
  path: string;
  href: string | null;
  shell: RouteShell;
  section: RouteSection;
  isActive: boolean;
  isParameterized: boolean;
  requiresAuth: boolean;
  requiresWorkspace: boolean;
  requiresProject: boolean;
  primaryAction: string | null;
}

export interface RouteBreadcrumbItem {
  id: string;
  label: string;
  href: string | null;
}

const PARAM_PATTERN = /:([A-Za-z0-9_]+)/g;

export function normalizeRouteParams(params: RoutePathParams = {}): RoutePathParams {
  const normalized = { ...params };

  if (normalized.id === undefined && normalized.projectId !== undefined) {
    normalized.id = normalized.projectId;
  }

  if (normalized.projectId === undefined && normalized.id !== undefined) {
    normalized.projectId = normalized.id;
  }

  return normalized;
}

export function getRouteParamNames(path: string) {
  return Array.from(path.matchAll(PARAM_PATTERN)).map((match) => match[1]);
}

export function isParameterizedRoute(path: string) {
  return getRouteParamNames(path).length > 0;
}

export function resolveRouteHref(path: string, params: RoutePathParams = {}) {
  if (path === "*") return null;

  const normalizedParams = normalizeRouteParams(params);
  const missingParams: string[] = [];
  const resolved = path.replace(PARAM_PATTERN, (_, paramName: string) => {
    const value = normalizedParams[paramName];
    if (value === null || value === undefined || value === "") {
      missingParams.push(paramName);
      return "";
    }
    return encodeURIComponent(String(value));
  });

  return missingParams.length > 0 ? null : resolved;
}

export function matchRoutePath(routePath: string, pathname: string) {
  if (routePath === "*") return true;
  if (routePath === pathname) return true;

  const pattern = routePath
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) return "[^/]+";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^${pattern}$`).test(pathname);
}

export function createRouteNavItem(
  route: AppRouteConfig,
  pathname = "",
  params: RoutePathParams = {},
): RouteNavItem {
  return {
    id: route.meta.id,
    label: route.meta.title,
    path: route.path,
    href: resolveRouteHref(route.path, params),
    shell: route.meta.shell,
    section: route.meta.section,
    isActive: pathname ? matchRoutePath(route.path, pathname) : false,
    isParameterized: isParameterizedRoute(route.path),
    requiresAuth: route.meta.requiresAuth === true,
    requiresWorkspace: route.meta.requiresWorkspace === true,
    requiresProject: route.meta.requiresProject === true,
    primaryAction: route.meta.primaryAction ?? null,
  };
}

export function getShellNavigationItems(
  shell: RouteShell,
  pathname = "",
  params: RoutePathParams = {},
  routes: AppRouteConfig[] = appRoutes,
) {
  return getNavigableRoutesForShell(shell, routes).map((route) => createRouteNavItem(route, pathname, params));
}

export function getPrimaryShellNavigationItem(
  shell: RouteShell,
  pathname = "",
  params: RoutePathParams = {},
  routes: AppRouteConfig[] = appRoutes,
) {
  const route = getPrimaryRouteForShell(shell, routes);
  return route ? createRouteNavItem(route, pathname, params) : null;
}

export function findRouteForPathname(pathname: string, routes: AppRouteConfig[] = appRoutes) {
  return routes.find((route) => route.path !== "*" && matchRoutePath(route.path, pathname)) ?? null;
}

export function getRouteBreadcrumbs(
  route: AppRouteConfig,
  params: RoutePathParams = {},
  routes: AppRouteConfig[] = appRoutes,
): RouteBreadcrumbItem[] {
  const primaryShellRoute = getPrimaryRouteForShell(route.meta.shell, routes);
  const breadcrumbs: RouteBreadcrumbItem[] = [];

  if (primaryShellRoute && primaryShellRoute.meta.id !== route.meta.id) {
    breadcrumbs.push({
      id: primaryShellRoute.meta.id,
      label: primaryShellRoute.meta.title,
      href: resolveRouteHref(primaryShellRoute.path, params),
    });
  }

  breadcrumbs.push({
    id: route.meta.id,
    label: route.meta.title,
    href: resolveRouteHref(route.path, params),
  });

  return breadcrumbs;
}
