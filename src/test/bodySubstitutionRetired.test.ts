import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runPreflightRepair } from '@/services/aiSitePreflightRepair';
import { createLaunchRun, isLaunchFatalError } from '@/services/launch/launchRun';
import { findBodySubstitutionViolations } from '../../scripts/lint-pipeline-bypass.mjs';

/**
 * Phase 4 regression net: no path may author or replace a page body.
 * Each failure mode below must surface as a diagnostic or a fatal launch,
 * never as substituted content.
 */
describe('body-substitution authorities are retired', () => {
  it('leaves an unparseable file untouched instead of swapping in a template section', () => {
    const broken = 'export default function Home(){ return <main>Unterminated';
    const result = runPreflightRepair(
      { '/src/pages/Home.tsx': broken },
      { allowQuarantine: false, context: { industry: 'salon', brand: 'Acme' } },
    );

    expect(result.quarantinedCount).toBe(1);
    expect(result.files['/src/pages/Home.tsx']).toBe(broken);
    expect(result.files['/src/pages/Home.tsx']).not.toContain('Auto-quarantined');
  });

  it('still quarantines for non-strict callers that opt in', () => {
    const result = runPreflightRepair(
      { '/src/pages/Home.tsx': 'export default function Home(){ return <main>Unterminated' },
      { context: { industry: 'salon', brand: 'Acme' } },
    );
    expect(result.quarantinedCount).toBe(1);
    expect(result.files['/src/pages/Home.tsx']).toContain('Auto-quarantined');
  });

  it('makes authorship stage failures fatal even when a fallback is offered', async () => {
    const run = createLaunchRun();
    let fallbackUsed = false;

    await expect(
      run.stage('preflight', async () => {
        throw new Error('merge produced no page body');
      }, {
        fallback: () => {
          fallbackUsed = true;
          return 'scaffold';
        },
      }),
    ).rejects.toSatisfy((error: unknown) => isLaunchFatalError(error));

    expect(fallbackUsed).toBe(false);
    const snapshot = run.snapshot();
    expect(snapshot.fatal).toContain('merge produced no page body');
    expect(snapshot.stages.find((s) => s.name === 'preflight')?.status).toBe('failed');
  });

  it('still allows non-authorship stages to degrade with a fallback', async () => {
    const run = createLaunchRun();
    const value = await run.stage('commit', async () => {
      throw new Error('transient write failure');
    }, { fallback: () => 'retried-later' });

    expect(value).toBe('retried-later');
    expect(run.snapshot().fatal).toBeNull();
  });

  it('removes the chip-injection resolver from preview prep', () => {
    const prep = readFileSync('src/utils/sandpackFilePrep.ts', 'utf8');
    expect(prep).not.toContain('generateIndustryContextualComponent');
    expect(prep).not.toContain('SECTION_GENERATORS');
    expect(prep).not.toContain('chip-inject COMPLETE');
  });

  it('fails the pipeline lint when a call site re-enables a substitution path', () => {
    const source = [
      'const artifacts = build({ allowCanonicalPageFallback: true });',
      'const repaired = runPreflightRepair(files, { allowQuarantine: true });',
      'prepareSandpackFiles(files, { failOnMissingImport: false });',
    ].join('\n');

    const violations = findBodySubstitutionViolations(source, 'source.ts');
    expect(violations.map((v) => v.symbol)).toEqual([
      'allowCanonicalPageFallback: true',
      'allowQuarantine: true',
      'failOnMissingImport: false',
    ]);
  });
});
