import type { PageRegistry } from '@/types/pageRegistry';

export const WIZARD_NAVBAR_PATH = '/src/sections/SiteNavbar.tsx';
export const WIZARD_FOOTER_PATH = '/src/sections/SiteFooter.tsx';

interface WizardNavItem {
  label: string;
  path: string;
  pageId: string;
}

function normalizeRoute(path: string): string {
  if (!path || path === '/') return '/';
  const normalized = path.trim().replace(/\.html?$/i, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function buildNavItems(registry?: PageRegistry | null): WizardNavItem[] {
  if (!registry) {
    return [{ label: 'Home', path: '/', pageId: 'home' }];
  }

  const pages = Object.values(registry.pages).sort((a, b) => a.navOrder - b.navOrder);
  const home = pages.find((page) => page.isHome || page.pageId === registry.homePageId);
  const visible = pages.filter((page) => page.showInNav);
  const selected = home && !visible.some((page) => page.pageId === home.pageId)
    ? [home, ...visible]
    : visible;

  return selected.map((page) => ({
    label: page.title || (page.isHome ? 'Home' : page.path),
    path: normalizeRoute(page.isHome ? '/' : page.path),
    pageId: page.pageId,
  }));
}

function buildNavbarSource(items: WizardNavItem[], businessName: string): string {
  const serializedItems = JSON.stringify(items, null, 2);
  const serializedBrand = JSON.stringify(businessName || 'Home');

  return `import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = ${serializedItems} as const;
const BRAND = ${serializedBrand};

function navClassName({ isActive }: { isActive: boolean }) {
  return [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  ].join(' ');
}

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6" aria-label="Primary navigation">
        <NavLink
          to="/"
          end
          className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground"
          data-ut-intent="nav.goto"
          data-ut-path="/"
          data-ut-target-page-id={NAV_ITEMS.find((item) => item.path === '/')?.pageId || 'home'}
        >
          {BRAND}
        </NavLink>
        <div className="hidden flex-wrap items-center justify-end gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.pageId}
              to={item.path}
              end={item.path === '/'}
              className={navClassName}
              data-ut-intent="nav.goto"
              data-ut-path={item.path}
              data-ut-target-page-id={item.pageId}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Menu
          </summary>
          <div className="absolute right-0 mt-2 grid min-w-52 gap-1 rounded-lg border border-border bg-card p-2 text-card-foreground shadow-lg">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.pageId}
                to={item.path}
                end={item.path === '/'}
                className={navClassName}
                data-ut-intent="nav.goto"
                data-ut-path={item.path}
                data-ut-target-page-id={item.pageId}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}

export default SiteNavbar;
`;
}

function buildFooterSource(items: WizardNavItem[], businessName: string): string {
  const serializedItems = JSON.stringify(items, null, 2);
  const serializedBrand = JSON.stringify(businessName || 'This business');

  return `import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_LINKS = ${serializedItems} as const;
const BRAND = ${serializedBrand};

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-10 text-sm text-muted-foreground sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-start">
        <div>
          <p className="font-semibold text-foreground">{BRAND}</p>
          <p className="mt-2 max-w-md">Explore every page available from this site.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 md:justify-end" aria-label="Footer navigation">
          {FOOTER_LINKS.map((item) => (
            <Link
              key={item.pageId}
              to={item.path}
              className="transition-colors hover:text-foreground"
              data-ut-intent="nav.goto"
              data-ut-path={item.path}
              data-ut-target-page-id={item.pageId}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-border pt-5 text-xs">
        © {new Date().getFullYear()} {BRAND}. All rights reserved.
      </div>
    </footer>
  );
}

export default SiteFooter;
`;
}

export function buildCanonicalWizardSharedChromeModules(
  registry?: PageRegistry | null,
  businessName = '',
): Record<string, string> {
  const items = buildNavItems(registry);
  return {
    [WIZARD_NAVBAR_PATH]: buildNavbarSource(items, businessName),
    [WIZARD_FOOTER_PATH]: buildFooterSource(items, businessName),
  };
}

export function isCanonicalWizardSharedChromePath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/^\/?src\//i, '/src/');
  return normalized.toLowerCase() === WIZARD_NAVBAR_PATH.toLowerCase()
    || normalized.toLowerCase() === WIZARD_FOOTER_PATH.toLowerCase();
}

export function getCanonicalWizardSharedChrome(
  path: string,
  registry?: PageRegistry | null,
  businessName = '',
): string | null {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const modules = buildCanonicalWizardSharedChromeModules(registry, businessName);
  const match = Object.entries(modules).find(([modulePath]) => (
    modulePath.toLowerCase() === normalized.toLowerCase()
    || modulePath.replace(/^\/src/, '').toLowerCase() === normalized.toLowerCase()
  ));
  return match?.[1] ?? null;
}

/** Sandpack flattens /src/* modules to root-level paths. */
export function getCanonicalWizardSharedChromeModules(
  registry?: PageRegistry | null,
  businessName = '',
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(buildCanonicalWizardSharedChromeModules(registry, businessName))
      .map(([path, source]) => [
        path.replace(/^\/src/, '').replace(/\.(tsx|jsx|ts|js)$/i, '').toLowerCase(),
        source,
      ]),
  );
}

export function getMissingCanonicalChromeRoutes(
  files: Record<string, string>,
  registry: PageRegistry,
): string[] {
  const navbar = files[WIZARD_NAVBAR_PATH] || files[WIZARD_NAVBAR_PATH.replace(/^\/src/, '')] || '';
  const footer = files[WIZARD_FOOTER_PATH] || files[WIZARD_FOOTER_PATH.replace(/^\/src/, '')] || '';
  return buildNavItems(registry)
    .filter((item) => !navbar.includes(JSON.stringify(item.path)) || !footer.includes(JSON.stringify(item.path)))
    .map((item) => item.path);
}
