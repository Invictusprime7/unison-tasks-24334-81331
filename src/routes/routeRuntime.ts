import type { AppRouteMeta, RouteChrome, RouteSection, RouteShell } from "./routeConfig";
import { normalizeRouteParams, type RoutePathParams } from "./routeNavigationModel";

export type RouteRuntimeValueSource =
  | "params.id"
  | "params.projectId"
  | "params.workspaceId"
  | "params.businessId"
  | "location.state.projectId"
  | "location.state.workspaceId"
  | "location.state.businessId"
  | "location.state.returnProjectId"
  | "location.state.returnBusinessId";

export interface RouteRuntimeIdentity {
  projectId: string | null;
  workspaceId: string | null;
  businessId: string | null;
  sources: Partial<Record<"projectId" | "workspaceId" | "businessId", RouteRuntimeValueSource>>;
}

export interface RouteRuntimeContextValue {
  routeId: string;
  pathname: string;
  shell: RouteShell;
  section: RouteSection;
  chrome: RouteChrome;
  requiresAuth: boolean;
  requiresWorkspace: boolean;
  requiresProject: boolean;
  identity: RouteRuntimeIdentity;
}

export type RouteLocationState = Record<string, unknown> | null | undefined;

function stringFromUnknown(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readStateString(state: RouteLocationState, key: string) {
  if (!state || typeof state !== "object") return null;
  return stringFromUnknown(state[key]);
}

export function deriveRouteRuntimeIdentity(
  params: RoutePathParams = {},
  locationState: RouteLocationState = null,
): RouteRuntimeIdentity {
  const normalizedParams = normalizeRouteParams(params);
  const sources: RouteRuntimeIdentity["sources"] = {};

  let projectId = stringFromUnknown(normalizedParams.projectId);
  if (projectId) {
    sources.projectId = params.projectId !== undefined ? "params.projectId" : "params.id";
  } else {
    projectId = readStateString(locationState, "projectId");
    if (projectId) sources.projectId = "location.state.projectId";
  }

  if (!projectId) {
    projectId = readStateString(locationState, "returnProjectId");
    if (projectId) sources.projectId = "location.state.returnProjectId";
  }

  let workspaceId = stringFromUnknown(normalizedParams.workspaceId);
  if (workspaceId) {
    sources.workspaceId = "params.workspaceId";
  } else {
    workspaceId = readStateString(locationState, "workspaceId");
    if (workspaceId) sources.workspaceId = "location.state.workspaceId";
  }

  let businessId = stringFromUnknown(normalizedParams.businessId);
  if (businessId) {
    sources.businessId = "params.businessId";
  } else {
    businessId = readStateString(locationState, "businessId");
    if (businessId) sources.businessId = "location.state.businessId";
  }

  if (!businessId) {
    businessId = readStateString(locationState, "returnBusinessId");
    if (businessId) sources.businessId = "location.state.returnBusinessId";
  }

  return {
    projectId,
    workspaceId,
    businessId,
    sources,
  };
}

export function deriveRouteRuntime(
  meta: AppRouteMeta,
  pathname: string,
  params: RoutePathParams = {},
  locationState: RouteLocationState = null,
): RouteRuntimeContextValue {
  return {
    routeId: meta.id,
    pathname,
    shell: meta.shell,
    section: meta.section,
    chrome: meta.chrome,
    requiresAuth: meta.requiresAuth === true,
    requiresWorkspace: meta.requiresWorkspace === true,
    requiresProject: meta.requiresProject === true,
    identity: deriveRouteRuntimeIdentity(params, locationState),
  };
}

