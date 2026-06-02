/**
 * clearBuilderState — resets the WebBuilder to its initial empty state.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 24. Pure helper: accepts
 * all state mutators and the Fabric canvas as arguments so the component only
 * needs a thin useCallback wrapper.
 */

import { toast } from 'sonner';
import { Canvas as FabricCanvas } from 'fabric';
import { CLEARED_EDITOR_CODE, CLEARED_PREVIEW_CODE } from './clearedCanvasDefaults';

export interface ClearBuilderStateInput {
  setEditorCode: (code: string) => void;
  setPreviewCode: (code: string) => void;
  resetVFS: () => void;
  clearCurrentTemplate: () => void;
  setCurrentTemplateName: (name: string | null) => void;
  setSaveProjectName: (name: string) => void;
  setSaveProjectDescription: (desc: string) => void;
  fabricCanvas: FabricCanvas | null;
}

export function clearBuilderState({
  setEditorCode,
  setPreviewCode,
  resetVFS,
  clearCurrentTemplate,
  setCurrentTemplateName,
  setSaveProjectName,
  setSaveProjectDescription,
  fabricCanvas,
}: ClearBuilderStateInput): void {
  setEditorCode(CLEARED_EDITOR_CODE);
  setPreviewCode(CLEARED_PREVIEW_CODE);

  resetVFS();
  clearCurrentTemplate();
  setCurrentTemplateName(null);
  setSaveProjectName('');
  setSaveProjectDescription('');

  if (fabricCanvas) {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.renderAll();
  }

  toast('Canvas Cleared!', {
    description: 'Starting fresh with a clean slate',
  });
}
