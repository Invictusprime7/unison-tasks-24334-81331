import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { AppRouteMeta } from "./routeConfig";
import {
  deriveRouteRuntime,
  type RouteLocationState,
  type RouteRuntimeContextValue,
} from "./routeRuntime";

const RouteRuntimeContext = createContext<RouteRuntimeContextValue | null>(null);

interface RouteRuntimeProviderProps {
  meta: AppRouteMeta;
  children: ReactNode;
}

export function RouteRuntimeProvider({ meta, children }: RouteRuntimeProviderProps) {
  const location = useLocation();
  const params = useParams();

  const runtime = useMemo(
    () => deriveRouteRuntime(meta, location.pathname, params, location.state as RouteLocationState),
    [location.pathname, location.state, meta, params],
  );

  return <RouteRuntimeContext.Provider value={runtime}>{children}</RouteRuntimeContext.Provider>;
}

export function useRouteRuntime() {
  return useContext(RouteRuntimeContext);
}

export function useRequiredRouteRuntime() {
  const runtime = useRouteRuntime();
  if (!runtime) {
    throw new Error("useRequiredRouteRuntime must be used within RouteRuntimeProvider");
  }
  return runtime;
}
