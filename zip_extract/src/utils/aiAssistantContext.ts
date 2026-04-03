import type { BusinessSystemType } from "@/data/templates/types";
import { getSystemContract } from "@/data/templates/contracts";
import { getDefaultManifestForSystem, getManifestStats } from "@/data/templates/manifest";
import type { TemplateCtaAnalysis } from "@/utils/ctaContract";
import { CORE_INTENTS } from "@/coreIntents";

/**
 * Builds a compact “backend awareness” context string for the AI assistant.
 * This is intentionally a string (not structured) because it is appended to the LLM prompt.
 */
export function buildWebBuilderAIContext(opts: {
  systemType: BusinessSystemType | null;
  templateName?: string | null;
  ctaAnalysis?: TemplateCtaAnalysis | null;
  pageStructure?: string | null;
  backendState?: string | null;
  businessData?: string | null;
}): string {
  const { systemType, templateName, ctaAnalysis, pageStructure, backendState, businessData } = opts;

  const lines: string[] = [];
  lines.push("\n\n=== WEB BUILDER BACKEND CONTEXT (builder-author; propose+approve) ===");

  if (templateName) lines.push(`Template: ${templateName}`);
  if (systemType) lines.push(`System type: ${systemType}`);

  if (systemType) {
    const contract = getSystemContract(systemType);
    const manifest = getDefaultManifestForSystem(systemType);
    const stats = getManifestStats(manifest);

    lines.push("\nSystem contract:");
    lines.push(`- Required intents: ${contract.requiredIntents.join(", ") || "(none)"}`);
    lines.push(`- Required CTA slots: ${contract.requiredSlots.join(", ") || "(none)"}`);

    lines.push("\nBackend manifest:");
    lines.push(`- Outcome: ${manifest.businessOutcome}`);
    lines.push(
      `- Requires: ${stats.tableCount} tables, ${stats.workflowCount} workflows, ${stats.intentCount} intents`
    );
    lines.push(`- Tables: ${manifest.tables.map(t => `${t.name}${t.critical ? "*" : ""}`).join(", ")}`);
    lines.push(`- Intents: ${manifest.intents.map(i => i.intent).join(", ")}`);
  }

  if (ctaAnalysis) {
    lines.push("\nCurrent template wiring (detected from HTML):");
    lines.push(`- Intents present: ${ctaAnalysis.intents.join(", ") || "(none)"}`);
    lines.push(`- CTA slots present: ${ctaAnalysis.slots.join(", ") || "(none)"}`);
    lines.push(`- Had UT attributes already: ${ctaAnalysis.hadUtAttributes ? "yes" : "no"}`);
  }

  if (pageStructure) {
    lines.push("\nPage structure:");
    lines.push(pageStructure);
  }

  if (backendState) {
    lines.push("\nBackend state:");
    lines.push(backendState);
  }

  if (businessData) {
    lines.push("\nBusiness data:");
    lines.push(businessData);
  }

  // Authoritative, production-supported intent surface.
  const availableIntents = [...CORE_INTENTS];
  lines.push("\nRuntime intent registry (executable):");
  lines.push(availableIntents.join(", "));

  lines.push("\nRules:");
  lines.push("- Prefer editing existing template HTML in-place (broad UI edits allowed).");
  lines.push("- CTAs should use data-ut-cta + data-ut-intent + data-ut-label (also keep data-intent for compatibility).");
  lines.push("- Backend changes are allowed only as a PROPOSED plan; user approves before execution.");
  lines.push("- If you propose multi-file changes, output them as <file path=\"/path\">...content...</file> blocks (no markdown).");

  return lines.join("\n");
}
