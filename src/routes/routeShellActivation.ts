import type { AppRouteMeta, RouteShell } from "./routeConfig";

export interface RouteShellActivationOptions {
  enabled?: boolean;
  enabledShells?: RouteShell[];
  disabledRouteIds?: string[];
}

const DEFAULT_DISABLED_ROUTE_IDS = new Set([
  "landing",
  "auth",
  "auth-callback",
  "reset-password",
  "checkout-success",
  "checkout-cancel",
  "not-found",
]);

export function parseRouteShellsEnv(value: string | undefined): RouteShell[] | undefined {
  if (!value) return undefined;
  const shells = value
    .split(",")
    .map((shell) => shell.trim())
    .filter(Boolean) as RouteShell[];

  return shells.length > 0 ? shells : undefined;
}

export function isRouteShellEnabled(meta: AppRouteMeta, options: RouteShellActivationOptions = {}) {
  if (!options.enabled) return false;

  if (meta.chrome !== "canonical") return false;

  const disabledRouteIds = new Set([...DEFAULT_DISABLED_ROUTE_IDS, ...(options.disabledRouteIds ?? [])]);
  if (disabledRouteIds.has(meta.id)) return false;

  if (meta.shell === "focus") return false;

  if (options.enabledShells && !options.enabledShells.includes(meta.shell)) {
    return false;
  }

  return true;
}

export function getRouteShellActivationOptionsFromEnv(): RouteShellActivationOptions {
  return {
    enabled: import.meta.env.VITE_ENABLE_ROUTE_SHELLS === "true",
    enabledShells: parseRouteShellsEnv(import.meta.env.VITE_ROUTE_SHELLS),
  };
}
