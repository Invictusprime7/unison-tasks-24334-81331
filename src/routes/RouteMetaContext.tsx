import { createContext, useContext, type ReactNode } from "react";
import type { AppRouteMeta } from "./routeConfig";

const RouteMetaContext = createContext<AppRouteMeta | null>(null);

interface RouteMetaProviderProps {
  meta: AppRouteMeta;
  children: ReactNode;
}

export function RouteMetaProvider({ meta, children }: RouteMetaProviderProps) {
  return <RouteMetaContext.Provider value={meta}>{children}</RouteMetaContext.Provider>;
}

export function useRouteMeta() {
  return useContext(RouteMetaContext);
}

export function useRequiredRouteMeta() {
  const meta = useRouteMeta();
  if (!meta) {
    throw new Error("useRequiredRouteMeta must be used within RouteMetaProvider");
  }
  return meta;
}

