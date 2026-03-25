/**
 * Wizard State Machine
 *
 * useReducer-based state machine for the 7-step system launcher wizard.
 *
 * Steps:
 *   1. system-type   — Select business system type
 *   2. industry      — Select industry within system type
 *   3. family        — Choose template family (4 structural families)
 *   4. variant       — Choose visual variant (A/B/C)
 *   5. theme         — Choose theme identity + optional token overrides
 *   6. build-mode    — Fast Launch or AI Enhanced
 *   7. generate      — Build the system
 */
import { useReducer, useCallback } from 'react';
import type { BusinessSystemType } from '@/data/templates/types';
import type {
  TemplateFamilyId,
  TemplateVariantId,
  ThemeTokenOverrides,
  BuildMode,
} from '@/types/launchConfig';
import type { ThemeIdentity } from '@/themes/identities.stylex';

// ============================================================================
// WIZARD STEPS
// ============================================================================

export const WIZARD_STEPS = [
  'system-type',
  'industry',
  'family',
  'variant',
  'theme',
  'build-mode',
  'generate',
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

// ============================================================================
// STATE
// ============================================================================

export interface WizardState {
  step: WizardStep;
  stepIndex: number;
  systemType: BusinessSystemType | null;
  industryId: string | null;
  familyId: TemplateFamilyId | null;
  variantId: TemplateVariantId | null;
  themeIdentity: ThemeIdentity | null;
  tokenOverrides: ThemeTokenOverrides;
  buildMode: BuildMode | null;
  isGenerating: boolean;
  error: string | null;
}

const initialState: WizardState = {
  step: 'system-type',
  stepIndex: 0,
  systemType: null,
  industryId: null,
  familyId: null,
  variantId: null,
  themeIdentity: null,
  tokenOverrides: {},
  buildMode: null,
  isGenerating: false,
  error: null,
};

// ============================================================================
// ACTIONS
// ============================================================================

export type WizardAction =
  | { type: 'SET_SYSTEM_TYPE'; payload: BusinessSystemType }
  | { type: 'SET_INDUSTRY'; payload: string }
  | { type: 'SET_FAMILY'; payload: TemplateFamilyId }
  | { type: 'SET_VARIANT'; payload: TemplateVariantId }
  | { type: 'SET_THEME_IDENTITY'; payload: ThemeIdentity }
  | { type: 'SET_TOKEN_OVERRIDES'; payload: ThemeTokenOverrides }
  | { type: 'SET_BUILD_MODE'; payload: BuildMode }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: WizardStep }
  | { type: 'START_GENERATING' }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'RESET' };

// ============================================================================
// REDUCER
// ============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_SYSTEM_TYPE':
      return {
        ...state,
        systemType: action.payload,
        // Reset downstream selections when system type changes
        industryId: null,
        familyId: null,
        variantId: null,
        error: null,
      };

    case 'SET_INDUSTRY':
      return { ...state, industryId: action.payload, error: null };

    case 'SET_FAMILY':
      return {
        ...state,
        familyId: action.payload,
        // Reset variant when family changes
        variantId: null,
        error: null,
      };

    case 'SET_VARIANT':
      return { ...state, variantId: action.payload, error: null };

    case 'SET_THEME_IDENTITY':
      return { ...state, themeIdentity: action.payload, error: null };

    case 'SET_TOKEN_OVERRIDES':
      return { ...state, tokenOverrides: action.payload, error: null };

    case 'SET_BUILD_MODE':
      return { ...state, buildMode: action.payload, error: null };

    case 'NEXT_STEP': {
      const nextIndex = Math.min(state.stepIndex + 1, WIZARD_STEPS.length - 1);
      return { ...state, step: WIZARD_STEPS[nextIndex], stepIndex: nextIndex, error: null };
    }

    case 'PREV_STEP': {
      const prevIndex = Math.max(state.stepIndex - 1, 0);
      return { ...state, step: WIZARD_STEPS[prevIndex], stepIndex: prevIndex, error: null };
    }

    case 'GO_TO_STEP': {
      const idx = WIZARD_STEPS.indexOf(action.payload);
      if (idx === -1) return state;
      return { ...state, step: action.payload, stepIndex: idx, error: null };
    }

    case 'START_GENERATING':
      return { ...state, isGenerating: true, error: null };

    case 'GENERATION_ERROR':
      return { ...state, isGenerating: false, error: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// STEP VALIDATION
// ============================================================================

function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case 'system-type':
      return state.systemType !== null;
    case 'industry':
      return state.industryId !== null;
    case 'family':
      return state.familyId !== null;
    case 'variant':
      return state.variantId !== null;
    case 'theme':
      return state.themeIdentity !== null;
    case 'build-mode':
      return state.buildMode !== null;
    case 'generate':
      return false; // Terminal step
    default:
      return false;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const next = useCallback(() => {
    if (canAdvance(state)) {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [state]);

  const prev = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    next,
    prev,
    reset,
    canAdvance: canAdvance(state),
    isFirstStep: state.stepIndex === 0,
    isLastStep: state.step === 'generate',
    totalSteps: WIZARD_STEPS.length,
  };
}
