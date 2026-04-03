/**
 * Intent Pipeline Provider
 * Central provider for managing intent pipeline modals and redirects
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthModal } from './AuthModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  getPipelineConfig, 
  getAuthModalConfig, 
  isAuthIntent,
  determinePipelineAction,
  scrollToForm,
  type PipelineConfig,
  type AuthModalConfig,
} from '@/runtime/intentPipeline';
import { handleIntent, type IntentPayload, type IntentResult } from '@/runtime/intentRouter';
import type { CoreIntent } from '@/coreIntents';
import type { TemplateCategory } from '@/runtime/templateIntentConfig';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface PipelineState {
  // Auth modal
  authModalOpen: boolean;
  authModalConfig: AuthModalConfig | null;
  
  // Confirmation dialog
  confirmDialogOpen: boolean;
  confirmData: Record<string, unknown> | null;
  confirmIntent: CoreIntent | null;
  confirmConfig: PipelineConfig | null;
  
  // Loading state
  executingIntent: string | null;
}

interface PipelineContextValue extends PipelineState {
  /** Execute an intent through the pipeline */
  executeIntent: (
    intent: CoreIntent,
    payload: IntentPayload,
    options?: {
      hasFormContext?: boolean;
      category?: TemplateCategory;
      skipConfirmation?: boolean;
    }
  ) => Promise<IntentResult>;
  
  /** Open auth modal manually */
  openAuthModal: (config: AuthModalConfig) => void;
  
  /** Close all modals */
  closeModals: () => void;
}

const defaultState: PipelineState = {
  authModalOpen: false,
  authModalConfig: null,
  confirmDialogOpen: false,
  confirmData: null,
  confirmIntent: null,
  confirmConfig: null,
  executingIntent: null,
};

const PipelineContext = createContext<PipelineContextValue | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface IntentPipelineProviderProps {
  children: React.ReactNode;
  category?: TemplateCategory;
}

export const IntentPipelineProvider: React.FC<IntentPipelineProviderProps> = ({
  children,
  category,
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<PipelineState>(defaultState);

  // Pending execution callback for confirmation dialog
  const [pendingExecution, setPendingExecution] = useState<(() => Promise<void>) | null>(null);

  const closeModals = useCallback(() => {
    setState(prev => ({
      ...prev,
      authModalOpen: false,
      confirmDialogOpen: false,
      confirmData: null,
      confirmIntent: null,
      confirmConfig: null,
    }));
    setPendingExecution(null);
  }, []);

  const openAuthModal = useCallback((config: AuthModalConfig) => {
    setState(prev => ({
      ...prev,
      authModalOpen: true,
      authModalConfig: config,
    }));
  }, []);

  const executeIntent = useCallback(async (
    intent: CoreIntent,
    payload: IntentPayload,
    options?: {
      hasFormContext?: boolean;
      category?: TemplateCategory;
      skipConfirmation?: boolean;
    }
  ): Promise<IntentResult> => {
    const effectiveCategory = options?.category || category;
    const hasFormContext = options?.hasFormContext ?? false;
    const skipConfirmation = options?.skipConfirmation ?? false;
    
    console.log('[Pipeline] Executing intent:', intent, { hasFormContext, category: effectiveCategory, skipConfirmation });
    
    // Check for auth intents first
    if (isAuthIntent(intent)) {
      const authConfig = getAuthModalConfig(intent);
      if (authConfig) {
        openAuthModal(authConfig);
        return { success: true, message: 'Auth modal opened' };
      }
    }
    
    // Determine pipeline action
    const action = determinePipelineAction(intent, hasFormContext, effectiveCategory);
    console.log('[Pipeline] Determined action:', action);
    
    switch (action.action) {
      case 'scroll': {
        // Scroll to form on page
        const scrolled = scrollToForm(intent);
        if (scrolled) {
          toast.info('Please fill out the form below');
          return { success: true, message: 'Scrolled to form' };
        }
        // Fall through to redirect if scroll failed
      }
      // falls through
      
      case 'redirect': {
        const target = action.target || '/';
        // Pass intent context via state
        navigate(target, { 
          state: { 
            intent, 
            payload,
            returnUrl: window.location.pathname,
          } 
        });
        return { success: true, status: 'redirect', message: `Redirecting to ${target}` };
      }
      
      case 'modal': {
        if (action.target === 'auth') {
          const authConfig = getAuthModalConfig(intent) || { mode: 'signin' as const };
          openAuthModal(authConfig);
          return { success: true, message: 'Modal opened' };
        }
        // Other modal types can be added here
        break;
      }
      
      case 'confirm': {
        if (skipConfirmation) {
          // Skip confirmation, execute directly
          return executeDirectly(intent, payload);
        }
        
        // Show confirmation dialog
        const config = getPipelineConfig(intent, effectiveCategory);
        setState(prev => ({
          ...prev,
          confirmDialogOpen: true,
          confirmData: payload,
          confirmIntent: intent,
          confirmConfig: config,
        }));
        
        // Set up pending execution
        return new Promise((resolve) => {
          setPendingExecution(() => async () => {
            const result = await executeDirectly(intent, payload);
            resolve(result);
          });
        });
      }
      
      case 'execute':
      default:
        return executeDirectly(intent, payload);
    }
    
    return { success: false, error: 'Unknown pipeline action' };
  }, [category, navigate, openAuthModal]);

  // Direct execution helper
  const executeDirectly = async (intent: CoreIntent, payload: IntentPayload): Promise<IntentResult> => {
    setState(prev => ({ ...prev, executingIntent: intent }));
    
    try {
      const result = await handleIntent(intent, payload);
      
      const config = getPipelineConfig(intent, category);
      if (result.success && config.successMessage) {
        toast.success(config.successMessage);
      } else if (!result.success && result.error) {
        toast.error(result.error);
      }
      
      return result;
    } finally {
      setState(prev => ({ ...prev, executingIntent: null }));
    }
  };

  // Handle confirmation
  const handleConfirmation = async () => {
    if (pendingExecution) {
      await pendingExecution();
    }
    closeModals();
  };

  // Listen for global intent events
  useEffect(() => {
    const handleGlobalIntent = (event: CustomEvent<{ intent: CoreIntent; payload: IntentPayload }>) => {
      executeIntent(event.detail.intent, event.detail.payload);
    };
    
    window.addEventListener('pipeline:execute' as any, handleGlobalIntent);
    return () => window.removeEventListener('pipeline:execute' as any, handleGlobalIntent);
  }, [executeIntent]);

  const contextValue: PipelineContextValue = {
    ...state,
    executeIntent,
    openAuthModal,
    closeModals,
  };

  return (
    <PipelineContext.Provider value={contextValue}>
      {children}
      
      {/* Auth Modal */}
      {state.authModalConfig && (
        <AuthModal
          open={state.authModalOpen}
          onOpenChange={(open) => {
            if (!open) closeModals();
          }}
          config={state.authModalConfig}
          onSuccess={closeModals}
        />
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={state.confirmDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeModals();
        }}
        title={state.confirmIntent === 'quote.request' ? 'Confirm Quote Request' : 'Confirm Submission'}
        description="Please review your information before submitting."
        data={state.confirmData || {}}
        fields={state.confirmConfig?.confirmFields}
        onConfirm={handleConfirmation}
        confirmLabel={state.confirmIntent === 'quote.request' ? 'Request Quote' : 'Submit'}
      />
    </PipelineContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useIntentPipeline(): PipelineContextValue {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('useIntentPipeline must be used within an IntentPipelineProvider');
  }
  return context;
}

export default IntentPipelineProvider;
