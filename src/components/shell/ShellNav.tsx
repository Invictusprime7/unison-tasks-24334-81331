import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { RouteNavItem } from "@/routes";

interface ShellNavProps {
  items: RouteNavItem[];
  className?: string;
}

export function ShellNav({ items, className }: ShellNavProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Shell navigation" className={cn("flex min-w-0 items-center gap-1 overflow-x-auto", className)}>
      {items.map((item) => {
        const content = (
          <span
            className={cn(
              "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors",
              item.isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              !item.href && "cursor-not-allowed opacity-50",
            )}
          >
            {item.label}
          </span>
        );

        return item.href ? (
          <Link key={item.id} to={item.href} aria-current={item.isActive ? "page" : undefined}>
            {content}
          </Link>
        ) : (
          <span key={item.id} aria-disabled="true">
            {content}
          </span>
        );
      })}
    </nav>
  );
}

