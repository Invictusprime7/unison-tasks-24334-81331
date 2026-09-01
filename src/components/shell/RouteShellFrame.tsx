import { useMemo, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  findRouteForPathname,
  getPrimaryShellNavigationItem,
  getRouteBreadcrumbs,
  getRouteShellDefinition,
  getShellNavigationItems,
  useRouteMeta,
  type RoutePathParams,
} from "@/routes";
import { ShellHeader } from "./ShellHeader";
import { ShellNav } from "./ShellNav";

interface RouteShellFrameProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

function normalizeParams(params: Readonly<Record<string, string | undefined>>): RoutePathParams {
  return Object.fromEntries(Object.entries(params));
}

export function RouteShellFrame({ children, className, contentClassName }: RouteShellFrameProps) {
  const location = useLocation();
  const params = useParams();
  const routeMeta = useRouteMeta();

  const shellData = useMemo(() => {
    const currentRoute = findRouteForPathname(location.pathname);
    const effectiveMeta = routeMeta ?? currentRoute?.meta ?? null;
    if (!effectiveMeta) return null;

    const routeParams = normalizeParams(params);
    const definition = getRouteShellDefinition(effectiveMeta.shell);
    const navItems = getShellNavigationItems(effectiveMeta.shell, location.pathname, routeParams);
    const primaryNavItem = getPrimaryShellNavigationItem(effectiveMeta.shell, location.pathname, routeParams);
    const breadcrumbs = currentRoute ? getRouteBreadcrumbs(currentRoute, routeParams) : [];

    return {
      definition,
      navItems,
      primaryNavItem,
      breadcrumbs,
      title: effectiveMeta.title,
      description: definition.description,
      primaryAction: effectiveMeta.primaryAction ?? primaryNavItem?.primaryAction ?? null,
    };
  }, [location.pathname, params, routeMeta]);

  if (!shellData) {
    return <>{children}</>;
  }

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <ShellHeader
        definition={shellData.definition}
        title={shellData.title}
        description={shellData.description}
        breadcrumbs={shellData.breadcrumbs}
        primaryAction={shellData.primaryAction}
        primaryNavItem={shellData.primaryNavItem}
      />
      <div className="border-b border-border/70 bg-background px-4 py-2 md:px-6">
        <div className="mx-auto w-full max-w-screen-2xl">
          <ShellNav items={shellData.navItems} />
        </div>
      </div>
      <main className={cn("mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6", contentClassName)}>{children}</main>
    </div>
  );
}

