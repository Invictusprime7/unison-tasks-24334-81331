import { buildLaneBVfsContext } from '@/services/laneBBatchPlanner';

export function buildWizardLaneBVfsPayload(
  files: Record<string, string>,
): Record<string, string> {
  return buildLaneBVfsContext(files);
}