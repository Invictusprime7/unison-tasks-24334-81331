import { appRoutes, type AppRouteConfig, type RouteShell } from "./routeConfig";
import { getPrimaryRouteForShell, routeShellDefinitions } from "./routeShellModel";
import { getDeprecatedRouteAliases } from "./routeInventory";
import { getRouteParamNames } from "./routeNavigationModel";

export type RouteContractSeverity = "error" | "warning";

export interface RouteContractIssue {
  severity: RouteContractSeverity;
  code:
    | "missing_primary_shell_route"
    | "invalid_deprecated_alias"
    | "missing_context_requirement"
    | "incompatible_chrome"
    | "route_param_mismatch";
  routeId?: string;
  message: string;
}

const CANONICAL_CHROME_SHELLS = new Set<RouteShell>(["onboarding", "workspace", "project", "builder"]);

export function validateRouteContracts(routes: AppRouteConfig[] = appRoutes): RouteContractIssue[] {
  const issues: RouteContractIssue[] = [];
  const routePaths = new Set(routes.map((route) => route.path));

  for (const definition of Object.values(routeShellDefinitions)) {
    if (definition.primaryRouteId && !getPrimaryRouteForShell(definition.shell, routes)) {
      issues.push({
        severity: "error",
        code: "missing_primary_shell_route",
        message: `Shell ${definition.shell} primary route ${definition.primaryRouteId} does not exist.`,
      });
    }
  }

  for (const entry of getDeprecatedRouteAliases(routes)) {
    if (!entry.deprecatedAliasFor || !routePaths.has(entry.deprecatedAliasFor)) {
      issues.push({
        severity: "error",
        code: "invalid_deprecated_alias",
        routeId: entry.id,
        message: `Route ${entry.id} points to missing deprecated alias target ${entry.deprecatedAliasFor}.`,
      });
    }
  }

  for (const route of routes) {
    if (
      (route.meta.shell === "workspace" || route.meta.shell === "builder") &&
      route.meta.section !== "account" &&
      route.meta.requiresAuth &&
      !route.meta.requiresWorkspace
    ) {
      issues.push({
        severity: "error",
        code: "missing_context_requirement",
        routeId: route.meta.id,
        message: `Authenticated ${route.meta.shell} route ${route.meta.id} must require workspace context.`,
      });
    }

    if (route.meta.shell === "project" && route.meta.requiresProject && !route.meta.requiresWorkspace) {
      issues.push({
        severity: "error",
        code: "missing_context_requirement",
        routeId: route.meta.id,
        message: `Project route ${route.meta.id} must require workspace context.`,
      });
    }

    if (route.meta.chrome === "canonical" && !CANONICAL_CHROME_SHELLS.has(route.meta.shell)) {
      issues.push({
        severity: "error",
        code: "incompatible_chrome",
        routeId: route.meta.id,
        message: `Route ${route.meta.id} cannot use canonical chrome in ${route.meta.shell} shell.`,
      });
    }
  }

  const projectRoutes = routes.filter((route) => route.meta.shell === "project");
  const projectParamNames = new Set(projectRoutes.flatMap((route) => getRouteParamNames(route.path)));
  if (projectParamNames.has("id") && projectParamNames.has("projectId")) {
    issues.push({
      severity: "warning",
      code: "route_param_mismatch",
      message: "Project routes mix :id and :projectId. Navigation normalization currently bridges this legacy mismatch.",
    });
  }

  return issues;
}

export function getBlockingRouteContractIssues(routes: AppRouteConfig[] = appRoutes) {
  return validateRouteContracts(routes).filter((issue) => issue.severity === "error");
}
