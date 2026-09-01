const WIZARD_SHARED_CHROME: Record<string, string> = {
  'sections/sitenavbar': `import React from 'react';

export function SiteNavbar() {
  return (
    <header className="border-b border-border bg-background/95 text-foreground">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Primary navigation">
        <a href="#top" className="font-semibold tracking-wide" data-ut-intent="nav.goto">Home</a>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#work" data-ut-intent="nav.goto">Work</a>
          <a href="#about" data-ut-intent="nav.goto">About</a>
          <a href="#contact" data-ut-intent="nav.goto">Contact</a>
        </div>
      </nav>
    </header>
  );
}

export default SiteNavbar;
`,
  'sections/sitefooter': `import React from 'react';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Built with care.</p>
        <a href="#contact" className="text-foreground hover:text-primary" data-ut-intent="nav.goto">Start a conversation</a>
      </div>
    </footer>
  );
}

export default SiteFooter;
`,
};

export function getCanonicalWizardSharedChrome(path: string): string | null {
  const normalized = path
    .replace(/\\/g, '/')
    .replace(/^\/?src\//i, '')
    .replace(/^\//, '')
    .replace(/\.(tsx|jsx|ts|js)$/i, '')
    .toLowerCase();

  return WIZARD_SHARED_CHROME[normalized] ?? null;
}

export function getCanonicalWizardSharedChromeModules(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(WIZARD_SHARED_CHROME).map(([path, source]) => [`/${path}`, source]),
  );
}