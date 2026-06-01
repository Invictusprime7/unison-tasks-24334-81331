/**
 * Default seed code blocks used when the user clears the canvas.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 12 to keep the React
 * component free of multi-line literal noise. No runtime logic — just
 * exported constants.
 */

export const CLEARED_EDITOR_CODE = `// AI Web Builder - JavaScript Mode
// Use vanilla JavaScript to create interactive web experiences

// Example: Create a simple interactive button
const createButton = () => {
  const button = document.createElement("button");
  button.textContent = "Click Me!";
  button.style.padding = "12px 24px";
  button.style.fontSize = "16px";
  button.style.cursor = "pointer";
  
  button.onclick = () => {
    alert("Hello from Web Builder!");
  };
  
  return button;
};

// Usage: Uncomment to test
// document.body.appendChild(createButton());`;

export const CLEARED_PREVIEW_CODE = `import React from "react";

export default function App() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Welcome to AI Web Builder</h1>
      <p>Use the AI Code Assistant to generate components</p>
    </div>
  );
}`;
