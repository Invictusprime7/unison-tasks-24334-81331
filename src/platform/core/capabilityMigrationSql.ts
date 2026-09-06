/**
 * Capability migration SQL — deterministic DDL derived from pack contracts.
 *
 * Every statement is generated from a `PackTableContract`, never from model
 * output, so an approved capability pack can only ever produce:
 *
 *   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
 *   - `GRANT <privileges> ON <table> TO <role>`  (exactly the contract grants)
 *   - guarded `CREATE POLICY` for a command the table does not already cover
 *
 * There is no DROP, no REVOKE, no data statement and no `ALTER DATABASE`. The
 * policy statements are wrapped in a `DO` block that first checks `pg_policies`,
 * so applying the same pack twice is a no-op and hand-written policies are never
 * replaced or widened.
 *
 * The edge function `capability-migration-apply` re-derives this exact set
 * server-side and refuses to execute anything it did not generate itself.
 */

import type { CapabilityPack, PackGrant, PackTableContract } from './capabilityPacks';

export type MigrationStatementKind = 'rls' | 'grant' | 'policy';

export interface MigrationStatement {
  /** Stable id — the server matches client previews against these. */
  id: string;
  kind: MigrationStatementKind;
  table: string;
  /** Plain-English line shown in the approval UI. */
  description: string;
  sql: string;
}

export interface CapabilityMigration {
  statements: MigrationStatement[];
  /** The statements joined into one reviewable migration script. */
  sql: string;
  tables: string[];
}

const PRIVILEGE_ORDER = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'] as const;

/** Identifiers come from our own contracts, but validate anyway. */
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function assertIdentifier(value: string, what: string): string {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Unsafe ${what} in capability contract: ${value}`);
  }
  return value;
}

function formatPrivileges(grant: PackGrant): string {
  if (grant.privileges.includes('ALL')) return 'ALL';
  return PRIVILEGE_ORDER
    .filter((privilege) => privilege !== 'ALL' && grant.privileges.includes(privilege))
    .join(', ');
}

/**
 * The row-ownership predicate RLS filters on. `business_id` resolves through
 * the existing `is_business_member` SECURITY DEFINER function so policies never
 * recurse into the table they protect.
 */
function ownershipPredicate(contract: PackTableContract): string | null {
  const column = contract.ownershipColumn;
  if (!column) return null;
  assertIdentifier(column, 'ownership column');
  if (column === 'business_id') return `public.is_business_member(${column})`;
  if (column === 'owner_id' || column === 'user_id') return `${column} = auth.uid()`;
  return null;
}

interface PolicySpec {
  name: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  roles: string[];
  using?: string;
  withCheck?: string;
  description: string;
}

function policySpecs(contract: PackTableContract): PolicySpec[] {
  const table = contract.table;
  const owner = ownershipPredicate(contract);
  const specs: PolicySpec[] = [];

  if (contract.publicRead) {
    specs.push({
      name: `${table}_select_public`,
      command: 'SELECT',
      roles: ['anon', 'authenticated'],
      using: 'true',
      description: `Visitors can read ${table}.`,
    });
  } else if (owner) {
    specs.push({
      name: `${table}_select_member`,
      command: 'SELECT',
      roles: ['authenticated'],
      using: owner,
      description: `Only the owning business can read ${table}.`,
    });
  }

  if (contract.publicInsert) {
    // Public writes must still name an owner, otherwise the row is orphaned
    // and invisible to every read policy.
    const check = contract.ownershipColumn
      ? `${contract.ownershipColumn} IS NOT NULL`
      : 'true';
    specs.push({
      name: `${table}_insert_public_valid`,
      command: 'INSERT',
      roles: ['anon', 'authenticated'],
      withCheck: check,
      description: `Visitors can submit to ${table} without signing in.`,
    });
  } else if (owner) {
    specs.push({
      name: `${table}_insert_member`,
      command: 'INSERT',
      roles: ['authenticated'],
      withCheck: owner,
      description: `Only the owning business can create ${table} rows.`,
    });
  }

  if (owner) {
    specs.push({
      name: `${table}_update_member`,
      command: 'UPDATE',
      roles: ['authenticated'],
      using: owner,
      withCheck: owner,
      description: `Only the owning business can edit ${table}.`,
    });
    specs.push({
      name: `${table}_delete_member`,
      command: 'DELETE',
      roles: ['authenticated'],
      using: owner,
      description: `Only the owning business can delete from ${table}.`,
    });
  }

  return specs;
}

function policyStatement(contract: PackTableContract, spec: PolicySpec): MigrationStatement {
  const table = assertIdentifier(contract.table, 'table name');
  assertIdentifier(spec.name, 'policy name');

  const clauses = [
    `CREATE POLICY "${spec.name}" ON public.${table}`,
    `FOR ${spec.command}`,
    `TO ${spec.roles.join(', ')}`,
  ];
  if (spec.using) clauses.push(`USING (${spec.using})`);
  if (spec.withCheck) clauses.push(`WITH CHECK (${spec.withCheck})`);
  const create = clauses.join(' ');

  // Guarded: skip when a policy of that name exists OR when the table already
  // covers this command, so existing hand-written rules are never widened.
  const sql = [
    'DO $$',
    'BEGIN',
    '  IF NOT EXISTS (',
    '    SELECT 1 FROM pg_policies',
    `    WHERE schemaname = 'public'`,
    `      AND tablename = '${table}'`,
    `      AND (policyname = '${spec.name}' OR cmd IN ('${spec.command}', 'ALL'))`,
    '  ) THEN',
    `    EXECUTE '${create.replace(/'/g, "''")}';`,
    '  END IF;',
    'END $$;',
  ].join('\n');

  return {
    id: `policy:${table}:${spec.name}`,
    kind: 'policy',
    table,
    description: spec.description,
    sql,
  };
}

/** Statements for one table contract, in apply order: grants → RLS → policies. */
export function statementsForTable(contract: PackTableContract): MigrationStatement[] {
  const table = assertIdentifier(contract.table, 'table name');
  const statements: MigrationStatement[] = [];

  for (const grant of contract.grants) {
    const privileges = formatPrivileges(grant);
    if (!privileges) continue;
    statements.push({
      id: `grant:${table}:${grant.role}`,
      kind: 'grant',
      table,
      description: `Give ${grant.role} ${privileges.toLowerCase()} access to ${table} through the data API.`,
      sql: `GRANT ${privileges} ON public.${table} TO ${grant.role};`,
    });
  }

  statements.push({
    id: `rls:${table}`,
    kind: 'rls',
    table,
    description: `Turn on row-level security for ${table}.`,
    sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
  });

  for (const spec of policySpecs(contract)) {
    statements.push(policyStatement(contract, spec));
  }

  return statements;
}

/** Builds the full migration for a resolved, dependency-ordered pack set. */
export function buildCapabilityMigration(packs: CapabilityPack[]): CapabilityMigration {
  const statements: MigrationStatement[] = [];
  const seen = new Set<string>();
  const tables: string[] = [];

  for (const pack of packs) {
    for (const contract of pack.database.tables) {
      if (tables.includes(contract.table)) continue;
      tables.push(contract.table);
      for (const statement of statementsForTable(contract)) {
        if (seen.has(statement.id)) continue;
        seen.add(statement.id);
        statements.push(statement);
      }
    }
  }

  const sql = statements.map((statement) => statement.sql).join('\n\n');
  return { statements, sql, tables };
}
