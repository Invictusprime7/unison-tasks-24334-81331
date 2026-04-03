/**
 * Interactive Element Highlight
 * Visual highlight for elements in interactive/preview mode
 */

import React from 'react';

interface InteractiveElementHighlightProps {
  isInteractiveMode: boolean;
}

export const InteractiveElementHighlight: React.FC<InteractiveElementHighlightProps> = ({
  isInteractiveMode
}) => {
  // This component can add global styles for interactive mode highlighting
  // The actual highlighting logic should be in the WebBuilder or LiveHTMLPreview
  if (!isInteractiveMode) return null;

  return (
    <style>{`
      .interactive-element-hover {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px;
        cursor: pointer !important;
      }
      .interactive-element-selected {
        outline: 2px solid #8b5cf6 !important;
        outline-offset: 2px;
        background: rgba(139, 92, 246, 0.05) !important;
      }
    `}</style>
  );
};
