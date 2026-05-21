/**
 * BusinessBlueprint — The full capability-aware business operating contract
 * 
 * This is the structured output from SystemsAI.
 * It replaces loose prompt text with a deterministic object that drives
 * the entire provisioning pipeline:
 * 
 *   SystemAI → BusinessBlueprint → ContractCompiler → SiteBundle
 * 
 * The blueprint is the "what" (capabilities, pages, intents).
 * The SiteBundle is the "how" (sections, code, bindings, runtime).
 */

import type { CapabilityId } from './capabilityRegistry';
import type { CoreIntent } from '@/coreIntents';
import type { BusinessSystemType } from '@/data/templates/types';

// ============================================================================
// Blueprint
// ============================================================================

export interface BusinessBlueprint {
  /** Schema version for safe migrations */
  version: '1.0.0';

  /** Origin metadata */
  origin: {
    /** How was this blueprint created? */
    mode: 'systems_ai' | 'template_select' | 'manual';
    /** Original user prompt (if AI-generated) */
    prompt?: string;
    /** Timestamp of creation */
    createdAt: string;
  };

  /** Business identity */
  identity: {
    businessName: string;
    industry: string;
    /** Canonical system type for backend provisioning */
    systemType: BusinessSystemType;
    locale?: string;
    tagline?: string;
  };

  /** Capability set — drives provisioning */
  capabilities: {
    /** Capabilities enabled for this business */
    enabled: CapabilityId[];
    /** Primary goal drives CTA defaults and hero messaging */
    primaryGoal: 'leads' | 'bookings' | 'sales' | 'newsletter' | 'donations';
  };

  /** Intent contract — canonical intents this site is allowed to emit */
  intents: {
    /** All allowed intents (derived from capabilities) */
    allowed: CoreIntent[];
    /** Primary CTA intent (used for hero, navbar CTA) */
    primaryCta: CoreIntent;
    /** Secondary CTA intent (used for secondary buttons) */
    secondaryCta?: CoreIntent;
  };

  /** Page map — deterministic page structure */
  pages: BlueprintPage[];

  /** Brand direction (can be AI-generated or user-provided) */
  brand: {
    tone?: 'luxury' | 'minimal' | 'bold' | 'playful' | 'corporate' | 'editorial' | 'tech';
    colorPreference?: string;
    typographyPreference?: string;
  };

  /** CRM pipeline configuration */
  crm: {
    pipelineName: string;
    stages: string[];
    defaultStage: string;
  };

  /** Automation pack to install */
  automationPack: string;

  /** Contact/business information for seed data */
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    socials?: Record<string, string>;
  };

  /** Seed data for template generation */
  seedData?: Record<string, unknown>;
}

export interface BlueprintPage {
  title: string;
  path: string;
  purpose: 'landing' | 'services' | 'portfolio' | 'contact' | 'about' | 'blog' | 'shop' | 'checkout' | 'booking';
  isHome?: boolean;
  /** Expected section types (for validation) */
  expectedSections: string[];
}

// ============================================================================
// Blueprint Builder — Creates blueprint from industry profile + user input
// ============================================================================

import { getIndustryProfile, type IndustryProfile } from './industryMatrix';
import { getAllowedIntents } from './capabilityRegistry';

/**
 * Generate a BusinessBlueprint from an industry selection.
 * This is the deterministic path — no AI needed.
 */
export function createBlueprintFromIndustry(
  industry: string,
  businessName: string,
  options?: {
    prompt?: string;
    email?: string;
    phone?: string;
    additionalCapabilities?: CapabilityId[];
    tone?: BusinessBlueprint['brand']['tone'];
  }
): BusinessBlueprint {
  const profile = getIndustryProfile(industry);
  if (!profile) {
    throw new Error(`Unknown industry: "${industry}"`);
  }

  const capabilities = [
    ...profile.defaultCapabilities,
    ...(options?.additionalCapabilities || []),
  ].filter((v, i, a) => a.indexOf(v) === i) as CapabilityId[];

  const allowedIntents = getAllowedIntents(capabilities);

  return {
    version: '1.0.0',
    origin: {
      mode: options?.prompt ? 'systems_ai' : 'template_select',
      prompt: options?.prompt,
      createdAt: new Date().toISOString(),
    },
    identity: {
      businessName,
      industry: profile.industry,
      systemType: profile.systemType,
      tagline: undefined,
    },
    capabilities: {
      enabled: capabilities,
      primaryGoal: inferPrimaryGoal(profile),
    },
    intents: {
      allowed: allowedIntents,
      primaryCta: profile.primaryIntent,
      secondaryCta: allowedIntents.find(i => i !== profile.primaryIntent && i !== 'newsletter.subscribe'),
    },
    pages: profile.defaultPages.map(p => ({
      ...p,
      isHome: p.path === '/',
    })),
    brand: {
      tone: options?.tone,
    },
    crm: {
      pipelineName: profile.crmPipeline.name,
      stages: profile.crmPipeline.stages,
      defaultStage: profile.crmPipeline.defaultStage,
    },
    automationPack: profile.automationPack,
    contact: {
      email: options?.email,
      phone: options?.phone,
    },
  };
}

function inferPrimaryGoal(profile: IndustryProfile): BusinessBlueprint['capabilities']['primaryGoal'] {
  if (profile.defaultCapabilities.includes('booking')) return 'bookings';
  if (profile.defaultCapabilities.includes('commerce')) return 'sales';
  if (profile.defaultCapabilities.includes('donation')) return 'donations';
  if (profile.defaultCapabilities.includes('quoting') || profile.defaultCapabilities.includes('lead-capture')) return 'leads';
  return 'newsletter';
}
