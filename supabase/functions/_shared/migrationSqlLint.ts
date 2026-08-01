// Deno twin of src/services/migrationSqlLint.ts — keep in sync.
/**
 * migrationSqlLint — mandatory safety lint for any SQL that reaches an executor.
 *
 * Step 4 of the capability provisioning plan: every `CREATE TABLE public.*`
 * MUST be accompanied, in the same migration, by
 *   - at least one GRANT on that table,
 *   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`,
 *   - at least one policy for that table.
 * Missing any of those is a **blocker**, never a warning.
 *
 * Additionally a deny-list rejects managed schemas, role/database level
 * statements and destructive DDL outright.
 *
 * This module is intentionally dependency-free so it can be mirrored verbatim
 * into `supabase/functions/_shared/migrationSqlLint.ts` for server-side use.
 * Keep the two files in sync.
 */

export type MigrationLintSeverity = 'blocker' | 'warning';

export interface MigrationLintFinding {
  severity: MigrationLintSeverity;
  code: string;
  message: string;
  /** Table or object the finding relates to, when known. */
  subject?: string;
}

export interface MigrationLintResult {
  ok: boolean;
  blockers: MigrationLintFinding[];
  warnings: MigrationLintFinding[];
  findings: MigrationLintFinding[];
  /** Public-schema tables created by this migration. */
  createdTables: string[];
}

const MANAGED_SCHEMAS = ['auth', 'storage', 'realtime', 'supabase_functions', 'vault', 'pgsodium'];

interface DenyRule {
  code: string;
  pattern: RegExp;
  message: string;
}

const DENY_RULES: DenyRule[] = [
  { code: 'managed-schema', pattern: new RegExp(`\\b(create|alter|drop)\\s+(table|policy|trigger|function|type|index)\\s+(if\\s+(not\\s+)?exists\\s+)?(${MANAGED_SCHEMAS.join('|')})\\.`, 'i'), message: 'Managed Supabase schemas cannot be modified.' },
  { code: 'role-statement', pattern: /\b(create|alter|drop)\s+role\b/i, message: 'Role statements are not allowed in generated migrations.' },
  { code: 'database-statement', pattern: /\balter\s+database\b/i, message: 'ALTER DATABASE is not allowed.' },
  { code: 'drop-table', pattern: /\bdrop\s+table\b/i, message: 'DROP TABLE is not allowed in generated migrations.' },
  { code: 'drop-schema', pattern: /\bdrop\s+schema\b/i, message: 'DROP SCHEMA is not allowed.' },
  { code: 'truncate', pattern: /\btruncate\b/i, message: 'TRUNCATE is not allowed.' },
  { code: 'disable-rls', pattern: /\bdisable\s+row\s+level\s+security\b/i, message: 'Row Level Security may never be disabled.' },
  { code: 'grant-to-public', pattern: /\bgrant\b[\s\S]{0,200}?\bto\s+public\b/i, message: 'GRANT ... TO PUBLIC is not allowed; grant to anon/authenticated/service_role explicitly.' },
  { code: 'superuser-extension', pattern: /\bcreate\s+extension\b/i, message: 'Extensions must be installed by a platform migration, not a capability pack.' },
];

/** Strips `--` and block comments plus dollar-quoted bodies used for guards. */
function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

function normalizeTable(raw: string): string {
  return raw.replace(/"/g, '').trim().toLowerCase();
}

function collect(pattern: RegExp, sql: string, group: number): Set<string> {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  while ((match = re.exec(sql)) !== null) {
    const value = match[group];
    if (value) found.add(normalizeTable(value));
  }
  return found;
}

/**
 * Lints a migration script. Returns `ok: false` when any blocker is present.
 */
export function lintMigrationSql(rawSql: string): MigrationLintResult {
  const findings: MigrationLintFinding[] = [];
  const sql = stripComments(rawSql ?? '');

  if (!sql.trim()) {
    findings.push({ severity: 'blocker', code: 'empty', message: 'Migration contains no SQL.' });
    return finish(findings, []);
  }

  for (const rule of DENY_RULES) {
    if (rule.pattern.test(sql)) {
      findings.push({ severity: 'blocker', code: rule.code, message: rule.message });
    }
  }

  const created = collect(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?[a-zA-Z_][a-zA-Z0-9_"]*)/i, sql, 1);
  const granted = collect(/\bgrant\b[\s\S]{0,200}?\bon\s+(?:table\s+)?(?:public\.)?("?[a-zA-Z_][a-zA-Z0-9_"]*)/i, sql, 1);
  const rlsEnabled = collect(/\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?("?[a-zA-Z_][a-zA-Z0-9_"]*)[\s\S]{0,80}?enable\s+row\s+level\s+security/i, sql, 1);
  const policied = collect(/\bcreate\s+policy\b[\s\S]{0,300}?\bon\s+(?:public\.)?("?[a-zA-Z_][a-zA-Z0-9_"]*)/i, sql, 1);

  for (const table of created) {
    if (!granted.has(table)) {
      findings.push({ severity: 'blocker', code: 'missing-grant', subject: table, message: `Table public.${table} is created without any GRANT. Add grants for the roles your policies allow.` });
    }
    if (!rlsEnabled.has(table)) {
      findings.push({ severity: 'blocker', code: 'missing-rls', subject: table, message: `Table public.${table} does not enable Row Level Security.` });
    }
    if (!policied.has(table)) {
      findings.push({ severity: 'blocker', code: 'missing-policy', subject: table, message: `Table public.${table} has RLS but no policy, which locks it out entirely.` });
    }
  }

  // Policies that are wide open are allowed but flagged.
  if (/\busing\s*\(\s*true\s*\)/i.test(sql)) {
    findings.push({ severity: 'warning', code: 'permissive-policy', message: 'A policy uses `USING (true)` — confirm the data is genuinely public.' });
  }
  if (/security\s+definer/i.test(sql) && !/set\s+search_path/i.test(sql)) {
    findings.push({ severity: 'blocker', code: 'definer-search-path', message: 'SECURITY DEFINER functions must set an explicit search_path.' });
  }

  return finish(findings, Array.from(created));
}

function finish(findings: MigrationLintFinding[], createdTables: string[]): MigrationLintResult {
  const blockers = findings.filter((f) => f.severity === 'blocker');
  const warnings = findings.filter((f) => f.severity === 'warning');
  return { ok: blockers.length === 0, blockers, warnings, findings, createdTables };
}

/** One-line human summary for logs and approval cards. */
export function describeLintResult(result: MigrationLintResult): string {
  if (result.ok && result.warnings.length === 0) return 'SQL lint passed.';
  if (result.ok) return `SQL lint passed with ${result.warnings.length} warning(s).`;
  return `SQL lint blocked: ${result.blockers.map((b) => b.message).join(' ')}`;
}
