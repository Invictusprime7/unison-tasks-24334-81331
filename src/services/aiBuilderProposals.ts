/**
 * aiBuilderProposals — Client wrapper for the AI Builder proposal loop.
 *
 * Two edge functions back this:
 *   - `ai-builder-propose`  → drafts a proposal (SQL/edge/config), runs a
 *     dry-run report, persists as status='pending'.
 *   - `ai-builder-apply`    → owner/project-member approves, rejects, or
 *     marks-applied. Never executes raw SQL (hosted runtime constraint) —
 *     approved SQL migrations are handed back to the client to route through
 *     the platform migration flow.
 *
 * Direct table reads use the standard supabase client + RLS for listing.
 */
import { supabase } from '@/integrations/supabase/client';

export type ProposalKind = 'sql_migration' | 'edge_function' | 'config_change';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';

export interface AIBuilderProposal {
  id: string;
  project_id: string | null;
  business_id: string | null;
  proposed_by: string;
  reviewed_by: string | null;
  kind: ProposalKind;
  title: string;
  summary: string | null;
  rationale: string | null;
  payload: Record<string, unknown>;
  dry_run_report: Record<string, unknown> | null;
  status: ProposalStatus;
  apply_result: Record<string, unknown> | null;
  applied_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposeInput {
  kind: ProposalKind;
  title: string;
  summary?: string;
  rationale?: string;
  project_id?: string;
  business_id?: string;
  payload: Record<string, unknown>;
}

export async function proposeChange(input: ProposeInput): Promise<AIBuilderProposal> {
  const { data, error } = await supabase.functions.invoke<{ proposal: AIBuilderProposal }>(
    'ai-builder-propose',
    { body: input },
  );
  if (error) throw error;
  if (!data?.proposal) throw new Error('propose: empty response');
  return data.proposal;
}

export async function reviewProposal(
  proposalId: string,
  action: 'approve' | 'reject' | 'mark_applied',
  reviewerNote?: string,
): Promise<AIBuilderProposal> {
  const { data, error } = await supabase.functions.invoke<{ proposal: AIBuilderProposal }>(
    'ai-builder-apply',
    { body: { proposal_id: proposalId, action, reviewer_note: reviewerNote } },
  );
  if (error) throw error;
  if (!data?.proposal) throw new Error('apply: empty response');
  return data.proposal;
}

export async function listProposals(opts: {
  projectId?: string;
  businessId?: string;
  status?: ProposalStatus;
  limit?: number;
} = {}): Promise<AIBuilderProposal[]> {
  let q = (supabase as any)
    .from('ai_builder_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.projectId) q = q.eq('project_id', opts.projectId);
  if (opts.businessId) q = q.eq('business_id', opts.businessId);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AIBuilderProposal[];
}
