/**
 * launchFormDefinitionPersistence — persists the approved public form
 * definitions for a launched site.
 *
 * Confirmed-launch provisioning owns identity only, so the generated site's
 * form contracts have to be written from the commit path. `form-submit`
 * resolves `(business_id, project_id, site_id, external_id)` and enforces the
 * intent/required-field contract against these rows.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlannedFormDefinition } from '@/services/launchFormDefinitions';

export interface PersistLaunchFormDefinitionsInput {
  businessId: string;
  projectId: string;
  siteId: string;
  definitions: PlannedFormDefinition[];
}

export interface PersistLaunchFormDefinitionsResult {
  persistedCount: number;
  error: string | null;
}

export async function persistLaunchFormDefinitions(
  input: PersistLaunchFormDefinitionsInput,
): Promise<PersistLaunchFormDefinitionsResult> {
  const { businessId, projectId, siteId, definitions } = input;
  if (!businessId || !projectId || !siteId || definitions.length === 0) {
    return { persistedCount: 0, error: null };
  }

  const rows = definitions.map((definition) => ({
    business_id: businessId,
    project_id: projectId,
    site_id: siteId,
    external_id: definition.externalId,
    name: definition.name,
    intent: definition.intent,
    fields: definition.fields,
    is_active: true,
  }));

  const persist = () => supabase
    .from('form_definitions')
    .upsert(rows as never, { onConflict: 'business_id,project_id,site_id,external_id' });

  let { error } = await persist();
  // Launch provisioning and membership writes complete immediately before
  // this call. Retry once when the data API has not observed that new identity
  // yet; deterministic conflicts remain safe because this is an upsert.
  if (error && /fetch|network|timeout|temporar|row-level security|permission/i.test(error.message)) {
    ({ error } = await persist());
  }

  if (error) {
    return { persistedCount: 0, error: error.message };
  }
  return { persistedCount: rows.length, error: null };
}
