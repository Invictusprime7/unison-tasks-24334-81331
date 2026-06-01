/**
 * restoreAutosavedDraft — restores the WebBuilder autosaved draft from
 * localStorage on mount, when not loading a specific saved project.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 22. Pure side-effect
 * helper: no React imports. Caller provides setters and the
 * lastSavedCodeRef so state ownership stays in WebBuilder.
 */

import { format } from 'date-fns';
import { toast } from 'sonner';

const DEFAULT_PREVIEW_CODE =
  'import React from "react";\n\nexport default function App() {\n  return (\n    <div style={{ padding: "40px", textAlign: "center" }}>\n      <h1>Welcome to AI Web Builder</h1>\n      <p>Use the AI Code Assistant to generate components</p>\n    </div>\n  );\n}';

export interface RestoreAutosavedDraftInput {
  locationSearch: string;
  routeStateHasStructuredProject: boolean;
  lastSavedCodeRef: { current: string };
  setShowLauncher: (v: boolean) => void;
  setPreviewCode: (v: string) => void;
  setEditorCode: (v: string) => void;
  setLastSavedAt: (v: Date) => void;
}

export function restoreAutosavedDraft({
  locationSearch,
  routeStateHasStructuredProject,
  lastSavedCodeRef,
  setShowLauncher,
  setPreviewCode,
  setEditorCode,
  setLastSavedAt,
}: RestoreAutosavedDraftInput): void {
  try {
    // If the user navigated here to open a specific saved project, skip restore.
    const urlId = new URLSearchParams(locationSearch).get('id');
    if (urlId) return;

    // Also skip if incoming route state already carries structured project files.
    if (routeStateHasStructuredProject) return;

    const savedDraft = localStorage.getItem('webbuilder_autosave_draft');
    if (!savedDraft) return;

    const draft = JSON.parse(savedDraft);
    const savedTime = new Date(draft.savedAt);
    const now = new Date();
    const hoursSinceLastSave = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

    // Only restore if draft is less than 24 hours old
    if (hoursSinceLastSave >= 24 || !draft.code) return;

    // Check if there's meaningful content (not just default)
    const isDefaultContent = draft.code.includes('AI-generated code will appear here');
    if (isDefaultContent) return;

    setShowLauncher(false);
    setPreviewCode(draft.code);
    if (draft.editorCode) {
      setEditorCode(draft.editorCode);
    }
    lastSavedCodeRef.current = draft.code;
    setLastSavedAt(savedTime);
    toast.info('Draft restored', {
      description: `Last saved ${format(savedTime, 'MMM d, h:mm a')}`,
      action: {
        label: 'Discard',
        onClick: () => {
          localStorage.removeItem('webbuilder_autosave_draft');
          setPreviewCode(DEFAULT_PREVIEW_CODE);
        },
      },
    });
  } catch (error) {
    console.error('[AutoSave] Error restoring draft:', error);
  }
}
