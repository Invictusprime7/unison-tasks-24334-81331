import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RouteBreadcrumbItem, RouteNavItem, RouteShellDefinition } from "@/routes";
import { ShellBreadcrumbs } from "./ShellBreadcrumbs";
import { ShellStatusBadge } from "./ShellStatusBadge";

interface ShellHeaderProps {
  definition: RouteShellDefinition;
  title: string;
  description?: string;
  breadcrumbs?: RouteBreadcrumbItem[];
  primaryAction?: string | null;
  primaryNavItem?: RouteNavItem | null;
  className?: string;
}

export function ShellHeader({
  definition,
  title,
  description,
  breadcrumbs = [],
  primaryAction,
  primaryNavItem,
  className,
}: ShellHeaderProps) {
  const actionHref = primaryNavItem?.href ?? null;

  return (
    <header className={cn("border-b border-border/70 bg-background/95 px-4 py-4 backdrop-blur md:px-6", className)}>
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ShellStatusBadge shell={definition.shell} label={definition.label} />
          <ShellBreadcrumbs items={breadcrumbs} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-normal text-foreground md:text-2xl">{title}</h1>
            {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
          </div>

          {primaryAction && (
            actionHref ? (
              <Button asChild className="w-full shrink-0 md:w-auto">
                <Link to={actionHref}>
                  {primaryAction}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button className="w-full shrink-0 md:w-auto" disabled>
                {primaryAction}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}

