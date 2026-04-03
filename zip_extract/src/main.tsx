import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Enforce global dark theme (dark premium) across the whole app
document.documentElement.classList.add('dark');

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Prevent white/black screen by showing error message
  const root = document.getElementById("root");
  if (root && !root.innerHTML) {
    root.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #e2e8f0; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="color: #ef4444; margin-bottom: 1rem;">Application Error</h1>
          <p style="margin-bottom: 0.5rem;">An error occurred while loading the application.</p>
          <p style="color: #94a3b8; font-size: 0.875rem;">${event.error?.message || 'Unknown error'}</p>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Remove loading placeholder immediately
const placeholder = rootElement.querySelector('.loading-placeholder');
if (placeholder) {
  placeholder.remove();
}

try {
  const root = createRoot(rootElement);
  root.render(<App />);
  
  // Mark app as loaded
  document.body.classList.add('app-loaded');
  
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #e2e8f0; font-family: system-ui;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Failed to Start Application</h1>
        <p style="margin-bottom: 0.5rem;">Please check the browser console for details.</p>
        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}
