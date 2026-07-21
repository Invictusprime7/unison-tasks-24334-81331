import { describe, expect, it } from 'vitest';
import { extractDependencies, getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import {
  WIZARD_PREVIEW_RUNTIME_DEPENDENCIES,
  WIZARD_RUNTIME_DEPENDENCY_GROUPS,
} from '@/utils/sandpackDependencies';

describe('Wizard preview dependency runtime', () => {
  it('installs VFS package dependencies before their first import', () => {
    const result = extractDependencies({
      '/package.json': JSON.stringify({
        dependencies: { bootstrap: '^5.3.3', '@stylexjs/stylex': '^0.8.0' },
        devDependencies: { vite: '^5.4.0' },
      }),
      '/src/App.tsx': 'export default function App() { return <main />; }',
    });

    expect(result.dependencies.bootstrap).toBe('^5.3.3');
    expect(result.dependencies['@stylexjs/stylex']).toBe('^0.8.0');
    expect(result.dependencies.vite).toBeUndefined();
  });

  it('does not install Vite tooling imported by exported config files', () => {
    const result = extractDependencies({
      '/src/App.tsx': "import React from 'react'; export default () => <main />;",
      '/vite.config.ts': "import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react-swc'; export default defineConfig({ plugins: [react()] });",
    });

    expect(result.dependencies.vite).toBeUndefined();
    expect(result.dependencies['@vitejs/plugin-react-swc']).toBeUndefined();
  });

  it('exports the same Babel, Radix, Bootstrap, StyleX, and Tailwind groups used at runtime', () => {
    expect(WIZARD_RUNTIME_DEPENDENCY_GROUPS.babel['@babel/standalone']).toBeTruthy();
    expect(WIZARD_RUNTIME_DEPENDENCY_GROUPS.radix['@radix-ui/react-dialog']).toBeTruthy();
    expect(WIZARD_RUNTIME_DEPENDENCY_GROUPS.styling.bootstrap).toBeTruthy();
    expect(WIZARD_RUNTIME_DEPENDENCY_GROUPS.styling['@stylexjs/stylex']).toBeTruthy();
    expect(WIZARD_RUNTIME_DEPENDENCY_GROUPS.styling.tailwindcss).toBeTruthy();
    expect(WIZARD_PREVIEW_RUNTIME_DEPENDENCIES['@babel/standalone']).toBeTruthy();
  });

  it('installs only packages reached through the active VFS entry graph', () => {
    const result = getDependenciesForSandpack({
      '/index.tsx': "import App from './App'; export default App;",
      '/App.tsx': "import { Button } from './unison/ui/button'; export default () => <Button />;",
      '/unison/ui/button.tsx': "import { Slot } from './radix/slot'; import { cva } from 'class-variance-authority'; import { cn } from './cn'; export const Button = () => <Slot className={cn(cva(''), '')} />;",
      '/unison/ui/cn.ts': "import { clsx } from 'clsx'; import { twMerge } from 'tailwind-merge'; export const cn = (...value: unknown[]) => twMerge(clsx(value));",
      '/unison/ui/radix/slot.ts': "export * from '@radix-ui/react-slot';",
      '/unison/ui/radix/dialog.ts': "export * from '@radix-ui/react-dialog';",
    }, {}, { entryPoints: ['/index.tsx'] });

    expect(result.dependencies['@radix-ui/react-slot']).toBeTruthy();
    expect(result.dependencies['class-variance-authority']).toBeTruthy();
    expect(result.dependencies['clsx']).toBeTruthy();
    expect(result.dependencies['tailwind-merge']).toBeTruthy();
    expect(result.dependencies['@radix-ui/react-dialog']).toBeUndefined();
  });
});
