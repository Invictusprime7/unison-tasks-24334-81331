import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/BusinessContent.tsx'), 'utf8');
const routes = readFileSync(resolve(process.cwd(), 'src/routes/routeConfig.tsx'), 'utf8');

describe('Business content workspace', () => {
  it('uses the command gateway for types, entries, workflow, and revisions', () => {
    expect(page).toContain('listContentTypes');
    expect(page).toContain('createContentRecord');
    expect(page).toContain('transitionContentRecord');
    expect(page).toContain('listContentRevisions');
    expect(page).not.toContain(".from('");
  });

  it('registers a protected static content route before the catalog wildcard', () => {
    expect(routes.indexOf('path: "/business/content"')).toBeLessThan(routes.indexOf('path: "/business/:catalogKey"'));
    expect(routes).toContain('id: "business-content"');
  });
});