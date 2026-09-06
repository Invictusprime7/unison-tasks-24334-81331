#!/usr/bin/env node
/**
 * PostToolUse hook (scoped to the Unison Runtime Debugger agent).
 * After any file-edit tool call, runs `npm run type-check` and, if it fails,
 * blocks further processing with the tsc output so the agent fixes its own
 * regression immediately instead of finishing the turn on broken types.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EDIT_TOOL_NAMES = new Set([
  'editFiles',
  'create_file',
  'replace_string_in_file',
  'multi_replace_string_in_file',
  'edit_notebook_file',
]);

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const raw = readStdin();
  let input;
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    input = {};
  }

  const toolName = input.tool_name || '';
  if (!EDIT_TOOL_NAMES.has(toolName)) {
    process.stdout.write('{}');
    return;
  }

  const result = spawnSync('npm', ['run', 'type-check'], {
    cwd: input.cwd || process.cwd(),
    encoding: 'utf8',
    shell: true,
    timeout: 110_000,
  });

  if (result.status === 0) {
    process.stdout.write('{}');
    return;
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim().slice(-4000);
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `type-check failed after this edit — fix the reported errors before continuing:\n\n${output}`,
  }));
}

main();
