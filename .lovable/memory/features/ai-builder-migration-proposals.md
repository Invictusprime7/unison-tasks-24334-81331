---
name: AI Builder — Migration Proposals + User Approval (Pass C)
description: Two edge functions (`ai-builder-propose`, `ai-builder-apply`) + `ai_builder_proposals` table + `MigrationProposalPanel` UI implement a propose→review→apply loop. Raw SQL never executes from edge functions — approved SQL migrations are handed back to the client to route through the Lovable migration tool. Config-change kind can safely merge into businesses.settings.
type: feature
---

## Contract

**Table:** `public.ai_builder_proposals`
- kinds: `sql_migration` | `edge_function` | `config_change`
- statuses: `pending` → `approved` | `rejected` → `applied` | `failed`
- RLS: owner OR project member (`is_project_member`) OR business member (`is_business_member`) can read/update; service role has full access.

**Edge fn `ai-builder-propose`** (`verify_jwt=true`)
- Zod-validates body, then runs `dryRunSql()`:
  - Deny-list: `DROP DATABASE`, `DROP SCHEMA auth|storage|...`, `ALTER DATABASE`, `TRUNCATE auth.*`, `GRANT ... TO PUBLIC`, `SECURITY DEFINER`, `CREATE|DROP ROLE`.
  - Warnings: touches managed schema, CREATE TABLE without GRANT, CREATE TABLE without RLS.
- Inserts row with `status='pending'` (or `'rejected'` if blockers) + `dry_run_report`.

**Edge fn `ai-builder-apply`** (`verify_jwt=true`)
- Authorization re-check via `is_project_member` RPC and `business_members` lookup.
- `action=approve`:
  - `sql_migration` → status='approved', `apply_result.migration_sql` echoed for client to hand to Lovable's migration tool (raw SQL execution from edge functions is forbidden on Lovable Cloud).
  - `config_change` with `payload.settings` + `business_id` → shallow-merges into `businesses.settings`, status='applied'.
  - `edge_function` → status='approved' with `next_step='redeploy_edge_function_manually'`.
- `action=reject` → status='rejected'.
- `action=mark_applied` → status='applied' (used after the user runs the SQL through the migration tool).

**Client:**
- `src/services/aiBuilderProposals.ts` — `proposeChange`, `reviewProposal`, `listProposals`.
- `src/components/ai-builder/MigrationProposalPanel.tsx` — list + approve/reject/mark-applied. Copies approved SQL to clipboard.

## Not implemented (intentional)
- Auto-execution of arbitrary SQL from an edge function. Lovable Cloud rule: never use `supabase.rpc("execute_sql")`. Approved migrations must go through the migration tool with user confirmation.
- Auto-deploy of edge-function proposals. Operator redeploys manually after approval.

## Wire-in points (future)
- `AIBuilderPanel` chat should call `proposeChange({ kind:'sql_migration', ... })` when the AI drafts schema changes and render a link to `MigrationProposalPanel`.
- Add a Health-Pill dot when `pending` proposals exist for the active project.
