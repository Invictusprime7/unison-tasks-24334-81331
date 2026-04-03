import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');
      
      if (isInputField) {
        return; // Don't process shortcuts when typing in input fields
      }
      
      // Existing shortcut matching logic continues below...
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === e.shiftKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === e.altKey;
        const metaMatch = shortcut.meta === undefined || shortcut.meta === e.metaKey;
        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};

export const defaultWebBuilderShortcuts = {
  undo: { key: "z", ctrl: true, description: "Undo" },
  redo: { key: "y", ctrl: true, description: "Redo" },
  redoAlt: { key: "z", ctrl: true, shift: true, description: "Redo (Alt)" },
  delete: { key: "Delete", description: "Delete selected" },
  backspace: { key: "Backspace", description: "Delete selected" },
  duplicate: { key: "d", ctrl: true, description: "Duplicate" },
  selectAll: { key: "a", ctrl: true, description: "Select all" },
  save: { key: "s", ctrl: true, description: "Save" },
  copy: { key: "c", ctrl: true, description: "Copy" },
  paste: { key: "v", ctrl: true, description: "Paste" },
  cut: { key: "x", ctrl: true, description: "Cut" },
  group: { key: "g", ctrl: true, description: "Group" },
  ungroup: { key: "g", ctrl: true, shift: true, description: "Ungroup" },
  bringForward: { key: "]", ctrl: true, description: "Bring forward" },
  sendBackward: { key: "[", ctrl: true, description: "Send backward" },
  togglePreview: { key: "p", ctrl: true, description: "Toggle preview" },
  toggleCode: { key: "k", ctrl: true, description: "Toggle code" },
};
