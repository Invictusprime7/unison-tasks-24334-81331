import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Wizard Edge contract repair', () => {
  it('routes empty reviewed Wizard payloads through the existing contract repair turn', () => {
    const orchestrator = readFileSync(
      resolve(process.cwd(), 'supabase/functions/ai-code-assistant/orchestrator.ts'),
      'utf8',
    );
    const emptyGuard = orchestrator.indexOf("Object.keys(outcome.files).length === 0");
    const repairGuard = orchestrator.indexOf("task.type === 'wizard_seed_generation' && !outcome && content.trim()");

    expect(emptyGuard).toBeGreaterThan(-1);
    expect(repairGuard).toBeGreaterThan(emptyGuard);
    expect(orchestrator).toContain('wizard output contained no approved files — running contract repair');
    expect(orchestrator).toContain('Include one body-only TSX file for every canonical WizardSeed page.');
  });
});
