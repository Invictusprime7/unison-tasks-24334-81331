/**
 * Capability Validator — Layer 3: Checks whether a parsed intent is feasible.
 * 
 * Validates against the project's current state:
 * - Are required capabilities provisioned?
 * - Do target files/pages exist?
 * - Is the builder in the correct mode?
 */

import type { ParsedUserIntent, CapabilityValidationResult, CapabilityStatus } from './nlTypes';
import type { CapabilityId } from '@/contracts/capabilityRegistry';

// ============================================================================
// Intent → Required Capability mapping
// ============================================================================

const INTENT_REQUIRES_CAPABILITY: Record<string, CapabilityId> = {
  'booking.create': 'booking',
  'quote.request': 'quoting',
  'contact.submit': 'contact',
  'newsletter.subscribe': 'newsletter',
  'lead.capture': 'lead-capture',
  'cart.add': 'commerce',
  'cart.checkout': 'commerce',
  'pay.checkout': 'commerce',
  'auth.login': 'auth',
  'auth.register': 'auth',
};

/** Route → required capabilities (for route-level validation) */
const ROUTE_REQUIRES_CAPABILITY: Record<string, CapabilityId[]> = {
  'crm.configure': ['lead-capture', 'contact'],
  'workflow.create': [],
  'intent.bind': [],
};

// ============================================================================
// Context interface (what the project currently has)
// ============================================================================

export interface ProjectContext {
  /** Capabilities currently provisioned */
  provisionedCapabilities: CapabilityId[];
  /** VFS file paths that exist */
  existingFiles: string[];
  /** Page slugs that exist */
  existingPages: string[];
  /** Current builder mode */
  builderMode: 'generate' | 'edit' | 'debug' | 'preview';
  /** Whether the project has a business ID */
  hasBusinessId: boolean;
  /** Installed workflow IDs */
  installedWorkflows: string[];
}

// ============================================================================
// Validator
// ============================================================================

/**
 * Validate whether a parsed intent can be executed given the current project context.
 */
export function validateCapabilities(
  intent: ParsedUserIntent,
  context: ProjectContext
): CapabilityValidationResult {
  const missingCapabilities: string[] = [];
  const missingFiles: string[] = [];
  const missingWorkflows: string[] = [];
  const suggestedActions: string[] = [];
  const blockers: string[] = [];

  // 1. Check intent-level capability requirements
  if (intent.entities.intentName) {
    const requiredCap = INTENT_REQUIRES_CAPABILITY[intent.entities.intentName];
    if (requiredCap && !context.provisionedCapabilities.includes(requiredCap)) {
      missingCapabilities.push(requiredCap);
      suggestedActions.push(`Enable the "${requiredCap}" capability first`);
    }
  }

  // 2. Check route-level capability requirements
  const routeCaps = ROUTE_REQUIRES_CAPABILITY[intent.primaryIntent];
  if (routeCaps) {
    for (const cap of routeCaps) {
      if (!context.provisionedCapabilities.includes(cap)) {
        missingCapabilities.push(cap);
      }
    }
  }

  // 3. Check target files exist (for edit operations)
  if (intent.targetFiles) {
    for (const file of intent.targetFiles) {
      if (!context.existingFiles.includes(file)) {
        missingFiles.push(file);
      }
    }
  }

  // 4. Check target pages exist (for page edit)
  if (intent.primaryIntent === 'page.edit' && intent.targetPageIds) {
    for (const pageId of intent.targetPageIds) {
      const slug = pageId.replace('page.', '/');
      if (!context.existingPages.includes(slug) && !context.existingPages.includes(pageId)) {
        missingFiles.push(`Page: ${pageId}`);
        suggestedActions.push(`Create the "${pageId}" page first`);
      }
    }
  }

  // 5. Check builder mode
  let correctBuilderMode = true;
  if (intent.primaryIntent === 'debug.fix' && context.builderMode !== 'debug') {
    correctBuilderMode = false;
    suggestedActions.push('Switch to debug mode for better diagnostics');
  }

  // 6. Business ID required for backend operations
  if (['crm.configure', 'workflow.create', 'capability.enable'].includes(intent.primaryIntent)) {
    if (!context.hasBusinessId) {
      blockers.push('No business configured. Create or connect a business first.');
    }
  }

  // Determine overall status
  let status: CapabilityStatus;
  if (blockers.length > 0) {
    status = 'unsupported';
  } else if (missingCapabilities.length > 0 || missingFiles.length > 0) {
    status = intent.primaryIntent.startsWith('capability.') ? 'supported' : 'partial';
  } else if (!correctBuilderMode) {
    status = 'supported_with_fallback';
  } else if (intent.requiresClarification) {
    status = 'needs_clarification';
  } else {
    status = 'supported';
  }

  return {
    status,
    missingCapabilities,
    missingFiles,
    missingWorkflows,
    suggestedActions,
    correctBuilderMode,
    blockers,
  };
}
