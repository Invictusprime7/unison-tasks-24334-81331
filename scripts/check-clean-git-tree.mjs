#!/usr/bin/env node
// Deployment gate: refuse to deploy from an uncommitted or unpushed tree.
// A CLI deploy with `gitDirty: 1` can ship bytes that never reach GitHub,
// so production silently drifts from what reviewers see in the repo.
import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

try {
  const status = run('git status --porcelain');
  if (status.length > 0) {
    console.error('[deploy-gate] Working tree is dirty — commit or stash before deploying:');
    console.error(status);
    process.exit(1);
  }

  let upstream;
  try {
    upstream = run('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
  } catch {
    console.error('[deploy-gate] No upstream branch configured — push and set an upstream before deploying.');
    process.exit(1);
  }

  const head = run('git rev-parse HEAD');
  const upstreamHead = run(`git rev-parse ${upstream}`);
  if (head !== upstreamHead) {
    console.error(`[deploy-gate] HEAD (${head.slice(0, 7)}) does not match ${upstream} (${upstreamHead.slice(0, 7)}).`);
    console.error('[deploy-gate] Push your commits so production deploys the exact reviewed commit.');
    process.exit(1);
  }

  console.log(`[deploy-gate] Clean tree at ${head.slice(0, 7)}, matches ${upstream}. Proceeding.`);
} catch (err) {
  console.error('[deploy-gate] Unable to verify git state:', err instanceof Error ? err.message : err);
  process.exit(1);
}
