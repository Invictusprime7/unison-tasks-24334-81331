/**
 * Contracts Module — Canonical business operating contracts
 * 
 * Pipeline:
 *   SystemAI → BusinessBlueprint → ContractCompiler → CompiledContract (preview/publish)
 */

// Capability Registry
export {
  CAPABILITY_REGISTRY,
  getCapability,
  getCapabilitiesForIndustry,
  getCapabilitiesForIntent,
  getAllowedIntents,
  getRequiredTables,
  getRequiredWorkflows,
  type CapabilityId,
  type CapabilityDefinition,
  type WorkflowSpec,
} from './capabilityRegistry';

// Industry Matrix
export {
  INDUSTRY_MATRIX,
  getIndustryProfile,
  getIndustryForCategory,
  getIndustryForSystemType,
  getAllIndustries,
  type IndustryProfile,
  type PageSpec,
} from './industryMatrix';

// Blueprint Schema
export {
  createBlueprintFromIndustry,
  type BusinessBlueprint,
  type BlueprintPage,
} from './blueprintSchema';

// Contract Compiler
export {
  compileContract,
  findNonCanonicalIntents,
  validateIntentsAgainstCapabilities,
  isPreviewReady,
  isPublishReady,
  type ContractValidation,
  type ValidationIssue,
  type ValidationSeverity,
  type CompiledContract,
  type CompiledBinding,
  type CompiledPage,
  type CompileOptions,
} from './contractCompiler';

// Route Policy
export {
  buildRoutePolicy,
  validateRouteLinks,
  isOverlayIntent,
  type RoutePolicy,
  type RouteEntry,
} from './routePolicy';

// Slot Binding Policy
export {
  resolveSlotBindings,
  getSlotIntent,
  type SlotBindingPolicy,
  type SlotBindingRule,
  type ResolvedSlotBinding,
  type SectionType,
  type SlotRole,
} from './slotBindingPolicy';

// Provisioning Validator
export {
  validateProvisioning,
  type ProvisioningReport,
  type CapabilityProvisioningCheck,
  type ProvisioningCheckItem,
  type ProvisioningStatus,
} from './provisioningValidator';

// Integrity Report
export {
  runIntegrityReport,
  type IntegrityReport,
  type IntegrityCheckResult,
  type IntegrityCategory,
  type IntegrityReportOptions,
} from './integrityReport';

// Site Topology Planner
export {
  planSiteTopology,
  populateRegistryFromTopology,
  type GeneratedSitePlan,
  type PageRouteNode,
  type RedirectBinding,
  type FunnelPlan,
  type PageRole,
} from './siteTopologyPlanner';

// Intent Normalizer
export {
  normalizePlaygroundIntent,
  isPlaygroundNavIntent,
  inferUIAction,
  type UIAction,
} from './intentNormalizer';

// Icon Intent Registry
export {
  ICON_INTENT_REGISTRY,
  getIconDefinition,
  resolveIconBehavior,
  resolveIconBinding,
  getIconsForSection,
  resolveIconKeyFromLucide,
  generateIconDataAttributes,
  type IconIntentDefinition,
  type IconPlacement,
  type IconUIBehavior,
  type IconInteractiveComponent,
  type ResolvedIconBinding,
} from './iconIntentRegistry';
