import { useState, useCallback } from "react";
import type { Industry } from "@/schemas/BusinessBlueprint";

/**
 * Hook for managing the Add Page Intent flow
 */
interface UseAddPageIntentOptions {
  industry: Industry;
  onAddPage: (data: { intent: string; label: string; path: string; customPrompt?: string }) => Promise<void>;
}

interface UseAddPageIntentReturn {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  setIsOpen: (open: boolean) => void;
  industry: Industry;
  onSubmit: (data: { intent: string; label: string; path: string; customPrompt?: string }) => Promise<void>;
}

export function useAddPageIntent(options: UseAddPageIntentOptions): UseAddPageIntentReturn {
  const [isOpen, setIsOpen] = useState(false);
  
  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);
  
  return {
    isOpen,
    openDialog,
    closeDialog,
    setIsOpen,
    industry: options.industry,
    onSubmit: options.onAddPage,
  };
}
