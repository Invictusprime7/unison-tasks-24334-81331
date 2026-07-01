/**
 * seedTemplates — seed TSX/JS code templates used when scaffolding new
 * pages, funnel steps, and the empty preview welcome screen.
 * Extracted from WebBuilder.tsx as part of Pass 5 decomposition.
 */

/** New empty page (used by "Add page" action). */
export function buildPageSeed(componentName: string, label: string): string {
  return `import { Link } from 'react-router-dom';

export default function ${componentName}Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
          <span className="text-sm text-foreground font-medium">${label}</span>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6">${label}</h1>
        <p className="text-muted-foreground text-lg">This is the ${label} page. Start editing to add your content.</p>
      </main>
    </div>
  );
}
`;
}

/** Funnel step page seed. */
export function buildFunnelStepSeed(params: {
  componentName: string;
  idx: number;
  role: string;
  title: string;
  nextLink: string;
}): string {
  const { componentName, idx, role, title, nextLink } = params;
  return `import { Link } from 'react-router-dom';

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4">Step ${idx + 1} · ${role}</div>
        <h1 className="text-4xl font-bold mb-6">${title}</h1>
        <p className="text-muted-foreground text-lg mb-8">This is the ${role} step of your funnel.</p>
        ${nextLink}
      </main>
    </div>
  );
}
`;
}

/** Welcome preview shown when there is no generated code yet. */
export const WELCOME_APP_TSX =
  'import React from "react";\n\nexport default function App() {\n  return (\n    <div style={{ padding: "40px", textAlign: "center" }}>\n      <h1>Welcome to AI Web Builder</h1>\n      <p>Use the AI Code Assistant to generate components</p>\n    </div>\n  );\n}';

/** Default JS-mode editor seed for "Clear canvas". */
export const CLEAR_CANVAS_JS_SEED =
  '// AI Web Builder - JavaScript Mode\n// Use vanilla JavaScript to create interactive web experiences\n\n// Example: Create a simple interactive button\nconst createButton = () => {\n  const button = document.createElement("button");\n  button.textContent = "Click Me!";\n  button.style.padding = "12px 24px";\n  button.style.fontSize = "16px";\n  button.style.cursor = "pointer";\n  \n  button.onclick = () => {\n    alert("Hello from Web Builder!");\n  };\n  \n  return button;\n};\n\n// Usage: Uncomment to test\n// document.body.appendChild(createButton());';
