import assert from 'node:assert/strict';
import test from 'node:test';
import { findForbiddenUsages } from './lint-pipeline-bypass.mjs';

test('ignores forbidden symbols in comments and strings', () => {
  const source = `
    // executeCanonicalPipeline is forbidden.
    /** recompileFromPlayground is also forbidden. */
    const message = 'executeCanonicalPipeline';
  `;

  assert.deepEqual(findForbiddenUsages(source), []);
});

test('reports forbidden imports and executable references', () => {
  const source = `
    import { executeCanonicalPipeline } from './pipeline';
    executeCanonicalPipeline(input);
  `;

  assert.deepEqual(
    findForbiddenUsages(source).map(({ line, symbol }) => ({ line, symbol })),
    [
      { line: 2, symbol: 'executeCanonicalPipeline' },
      { line: 3, symbol: 'executeCanonicalPipeline' },
    ],
  );
});