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
