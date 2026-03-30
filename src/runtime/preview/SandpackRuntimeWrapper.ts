/**
 * SandpackRuntimeWrapper - Bridge between WebBuilder and Preview Runtime
 * 
 * This module generates the React/TypeScript code that Sandpack will use
 * to render previews with the full intent-driven runtime.
 * 
 * Instead of raw HTML, we generate:
 * 1. A React app wrapped in PreviewRuntime
 * 2. All navigation via HashRouter
 * 3. All clicks resolved through intent system
 * 4. Mock CMS state for cart/auth/booking
 * 
 * Flow:
 * SiteBundle → generateSandpackFiles() → Sandpack
 */

import type { SiteBundle, PageBundle } from '@/types/siteBundle';
import { generateClickHandlerScript } from './PreviewClickResolver';

// ============================================================================
// Types
// ============================================================================

export interface SandpackFilesConfig {
  siteBundle: SiteBundle;
  /** Entry page path (default: '/') */
  entryPath?: string;
  /** Enable debug mode */
  debug?: boolean;
  /** Include TypeScript support */
  typescript?: boolean;
  /** Asset base URL for draft assets */
  assetBaseUrl?: string;
}

export interface SandpackFile {
  code: string;
  hidden?: boolean;
  active?: boolean;
  readOnly?: boolean;
}

export type SandpackFiles = Record<string, SandpackFile | string>;

// ============================================================================
// File Generation
// ============================================================================

/**
 * Generate all Sandpack files for a SiteBundle
 */
export function generateSandpackFiles(config: SandpackFilesConfig): SandpackFiles {
  const { siteBundle, entryPath = '/', debug = false, assetBaseUrl } = config;
  const ext = config.typescript ? '.tsx' : '.jsx';
  
  const files: SandpackFiles = {};
  
  // 1. Main entry point (App with PreviewRuntime)
  files[`/App${ext}`] = {
    code: generateAppFile(siteBundle, entryPath, debug, assetBaseUrl),
    active: true,
  };
  
  // 2. Page components
  const pages = siteBundle.pages ? Object.values(siteBundle.pages) : [];
  for (const page of pages) {
    files[`/pages/${sanitizeFilename(page.path)}${ext}`] = generatePageFile(page);
  }
  
  // 3. Click handler script (for injection)
  files['/runtime/clickHandler.js'] = {
    code: generateClickHandlerScript({ debug }),
    hidden: true,
  };
  
  // 4. Index.html
  files['/index.html'] = generateIndexHtml(debug);
  
  // 5. Styles
  files['/styles.css'] = generateStyles();
  
  // 6. SiteBundle JSON (for runtime access)
  files['/siteBundle.json'] = {
    code: JSON.stringify(siteBundle, null, 2),
    hidden: true,
    readOnly: true,
  };
  
  return files;
}

/**
 * Generate the main App component with PreviewRuntime
 */
function generateAppFile(
  siteBundle: SiteBundle,
  entryPath: string,
  debug: boolean,
  assetBaseUrl?: string
): string {
  const pages = siteBundle.pages ? Object.values(siteBundle.pages) : [];
  const pageImports = pages
    .map((p) => {
      const name = sanitizeComponentName(p.path);
      const file = sanitizeFilename(p.path);
      return `import ${name} from './pages/${file}';`;
    })
    .join('\n');
  
  const routes = pages
    .map((p) => {
      const name = sanitizeComponentName(p.path);
      return `        <Route path="${p.path}" element={<${name} />} />`;
    })
    .join('\n');
  
  return `
/**
 * Generated Preview App with Intent-Driven Runtime
 * 
 * This app is wrapped in PreviewRuntime which provides:
 * - HashRouter for navigation
 * - CMS mock state (cart, auth, bookings)
 * - Intent execution for all buttons/links
 * - Overlay system for modals
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import siteBundle from './siteBundle.json';
import './styles.css';

${pageImports}

// ============================================================================
// Preview Runtime Context (inline implementation for Sandpack)
// ============================================================================

const PreviewContext = React.createContext(null);

function usePreviewRuntime() {
  const ctx = React.useContext(PreviewContext);
  if (!ctx) throw new Error('usePreviewRuntime must be inside PreviewRuntime');
  return ctx;
}

// CMS mock state reducer
function cmsReducer(state, action) {
  switch (action.type) {
    case 'CART_ADD': {
      const existing = state.cart.items.find(i => i.productId === action.item.productId);
      let items;
      if (existing) {
        items = state.cart.items.map(i =>
          i.productId === action.item.productId
            ? { ...i, quantity: i.quantity + (action.item.quantity || 1) }
            : i
        );
      } else {
        items = [...state.cart.items, {
          id: 'cart-' + Date.now(),
          ...action.item,
          quantity: action.item.quantity || 1
        }];
      }
      return { ...state, cart: { items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) } };
    }
    case 'CART_REMOVE':
      const filtered = state.cart.items.filter(i => i.productId !== action.productId);
      return { ...state, cart: { items: filtered, total: filtered.reduce((s, i) => s + i.price * i.quantity, 0) } };
    case 'CART_CLEAR':
      return { ...state, cart: { items: [], total: 0 } };
    case 'AUTH_LOGIN':
      return { ...state, auth: { isLoggedIn: true, user: action.user } };
    case 'AUTH_LOGOUT':
      return { ...state, auth: { isLoggedIn: false, user: null } };
    default:
      return state;
  }
}

// ============================================================================
// Overlay Components
// ============================================================================

function OverlayContainer({ children }) {
  const { overlay, closeOverlay } = usePreviewRuntime();
  
  if (!overlay.active) return children;
  
  return (
    <>
      {children}
      <div className="overlay-backdrop" onClick={() => closeOverlay()} />
      <div className="overlay-container">
        <OverlayRouter type={overlay.active} payload={overlay.payload} />
      </div>
    </>
  );
}

function OverlayRouter({ type, payload }) {
  switch (type) {
    case 'cart': return <CartOverlay />;
    case 'auth': return <AuthOverlay mode={payload.mode || 'login'} />;
    case 'booking': return <BookingOverlay service={payload.service} />;
    case 'contact': return <ContactOverlay />;
    default: return <GenericOverlay type={type} payload={payload} />;
  }
}

function CartOverlay() {
  const { closeOverlay, cmsState, removeFromCart, clearCart } = usePreviewRuntime();
  
  return (
    <div className="overlay-card">
      <div className="overlay-header">
        <h2>Shopping Cart</h2>
        <button onClick={() => closeOverlay()}>✕</button>
      </div>
      <div className="overlay-body">
        {cmsState.cart.items.length === 0 ? (
          <p className="text-muted text-center">Your cart is empty</p>
        ) : (
          cmsState.cart.items.map(item => (
            <div key={item.id} className="cart-item">
              <div>
                <strong>{item.name}</strong>
                <small>\${item.price.toFixed(2)} × {item.quantity}</small>
              </div>
              <button onClick={() => removeFromCart(item.productId)} className="btn-link">Remove</button>
            </div>
          ))
        )}
      </div>
      {cmsState.cart.items.length > 0 && (
        <div className="overlay-footer">
          <div className="cart-total">Total: \${cmsState.cart.total.toFixed(2)}</div>
          <div className="btn-row">
            <button onClick={clearCart} className="btn-secondary">Clear</button>
            <button onClick={() => { alert('Checkout (Preview Mode)'); closeOverlay(); }} className="btn-primary">Checkout</button>
          </div>
          <small className="text-muted">(Preview mode - no payment)</small>
        </div>
      )}
    </div>
  );
}

function AuthOverlay({ mode: initialMode }) {
  const { closeOverlay } = usePreviewRuntime();
  const [mode, setMode] = React.useState(initialMode);
  const [submitted, setSubmitted] = React.useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => closeOverlay(), 1500);
  };
  
  if (submitted) {
    return (
      <div className="overlay-card">
        <div className="overlay-body text-center">
          <div className="success-icon">✓</div>
          <h3>{mode === 'login' ? 'Signed In!' : 'Account Created!'}</h3>
          <small className="text-muted">(Preview mode)</small>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overlay-card">
      <div className="overlay-header">
        <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <button onClick={() => closeOverlay()}>✕</button>
      </div>
      <form onSubmit={handleSubmit} className="overlay-body">
        <input type="email" placeholder="Email" required className="input" />
        <input type="password" placeholder="Password" required className="input" />
        <button type="submit" className="btn-primary">{mode === 'login' ? 'Sign In' : 'Sign Up'}</button>
        <p className="text-center">
          {mode === 'login' ? (
            <>No account? <button type="button" onClick={() => setMode('register')} className="btn-link">Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => setMode('login')} className="btn-link">Sign in</button></>
          )}
        </p>
      </form>
    </div>
  );
}

function BookingOverlay({ service }) {
  const { closeOverlay } = usePreviewRuntime();
  const [submitted, setSubmitted] = React.useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };
  
  if (submitted) {
    return (
      <div className="overlay-card">
        <div className="overlay-body text-center">
          <div className="success-icon">✓</div>
          <h3>Booking Confirmed!</h3>
          <small className="text-muted">(Preview mode)</small>
          <button onClick={() => closeOverlay()} className="btn-primary mt-4">Done</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overlay-card">
      <div className="overlay-header">
        <h2>Book {service || 'Appointment'}</h2>
        <button onClick={() => closeOverlay()}>✕</button>
      </div>
      <form onSubmit={handleSubmit} className="overlay-body">
        <div className="form-row">
          <input type="date" required className="input" />
          <select required className="input">
            <option value="">Time</option>
            <option>9:00 AM</option>
            <option>10:00 AM</option>
            <option>2:00 PM</option>
            <option>3:00 PM</option>
          </select>
        </div>
        <input type="text" placeholder="Name" required className="input" />
        <input type="email" placeholder="Email" required className="input" />
        <button type="submit" className="btn-primary">Confirm Booking</button>
      </form>
    </div>
  );
}

function ContactOverlay() {
  const { closeOverlay } = usePreviewRuntime();
  const [submitted, setSubmitted] = React.useState(false);
  
  if (submitted) {
    return (
      <div className="overlay-card">
        <div className="overlay-body text-center">
          <div className="success-icon">📬</div>
          <h3>Message Sent!</h3>
          <small className="text-muted">(Preview mode)</small>
          <button onClick={() => closeOverlay()} className="btn-primary mt-4">Done</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overlay-card">
      <div className="overlay-header">
        <h2>Contact Us</h2>
        <button onClick={() => closeOverlay()}>✕</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="overlay-body">
        <input type="text" placeholder="Name" required className="input" />
        <input type="email" placeholder="Email" required className="input" />
        <textarea placeholder="Message" rows={4} required className="input" />
        <button type="submit" className="btn-primary">Send Message</button>
      </form>
    </div>
  );
}

function GenericOverlay({ type, payload }) {
  const { closeOverlay } = usePreviewRuntime();
  return (
    <div className="overlay-card">
      <div className="overlay-header">
        <h2>{type}</h2>
        <button onClick={() => closeOverlay()}>✕</button>
      </div>
      <div className="overlay-body">
        <p className="text-muted">Overlay "{type}" not implemented in preview.</p>
        {Object.keys(payload).length > 0 && (
          <pre className="code-block">{JSON.stringify(payload, null, 2)}</pre>
        )}
      </div>
      <div className="overlay-footer">
        <button onClick={() => closeOverlay()} className="btn-primary">Close</button>
      </div>
    </div>
  );
}

// ============================================================================
// Preview Runtime Provider
// ============================================================================

function PreviewRuntimeProvider({ children, siteBundle }) {
  const navigate = (path) => {
    window.location.hash = path;
  };
  
  const [cmsState, dispatchCMS] = React.useReducer(cmsReducer, {
    cart: { items: [], total: 0 },
    auth: { isLoggedIn: false, user: null }
  });
  
  const [overlay, setOverlay] = React.useState({ active: null, payload: {} });
  
  const openOverlay = (type, payload = {}) => setOverlay({ active: type, payload });
  const closeOverlay = () => setOverlay({ active: null, payload: {} });
  
  const addToCart = (item) => {
    dispatchCMS({ type: 'CART_ADD', item });
    window.dispatchEvent(new CustomEvent('preview:cart.add', { detail: item }));
  };
  const removeFromCart = (productId) => dispatchCMS({ type: 'CART_REMOVE', productId });
  const clearCart = () => dispatchCMS({ type: 'CART_CLEAR' });
  
  const executeIntent = async (intent, payload = {}) => {
    console.log('[Runtime] Intent:', intent, payload);
    
    // Navigation
    if (intent === 'nav.goto' && payload.path) {
      navigate(payload.path);
      return { success: true };
    }
    if (intent === 'nav.anchor' && payload.anchor) {
      const el = document.querySelector('#' + payload.anchor + ', [data-section="' + payload.anchor + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return { success: true };
    }
    if (intent === 'nav.external' && payload.url) {
      window.open(payload.url, '_blank');
      return { success: true };
    }
    
    // Cart
    if (intent === 'cart.add') {
      addToCart(payload);
      openOverlay('cart');
      return { success: true };
    }
    if (intent === 'cart.view') {
      openOverlay('cart');
      return { success: true };
    }
    
    // Auth
    if (intent === 'auth.signin' || intent === 'auth.login') {
      openOverlay('auth', { mode: 'login' });
      return { success: true };
    }
    if (intent === 'auth.signup' || intent === 'auth.register') {
      openOverlay('auth', { mode: 'register' });
      return { success: true };
    }
    
    // Booking
    if (intent === 'booking.create' || intent === 'booking.book') {
      openOverlay('booking', payload);
      return { success: true };
    }
    
    // Overlays
    if (intent === 'overlay.open') {
      openOverlay(payload.type || 'default', payload);
      return { success: true };
    }
    if (intent === 'overlay.close') {
      closeOverlay();
      return { success: true };
    }
    
    // Contact
    if (intent === 'contact.submit' || intent === 'contact.open') {
      openOverlay('contact');
      return { success: true };
    }
    
    console.log('[Runtime] Unhandled intent:', intent);
    return { success: false, error: 'Unknown intent' };
  };
  
  // Global click handler
  React.useEffect(() => {
    const handleClick = async (e) => {
      const el = e.target.closest('a, button, [data-ut-intent]');
      if (!el) return;
      
      // Resolve intent
      const explicit = el.getAttribute('data-ut-intent');
      const href = el.getAttribute('href');
      let intent, payload = {};
      
      if (explicit) {
        intent = explicit;
      } else if (href) {
        if (href.startsWith('#')) {
          intent = 'nav.anchor';
          payload = { anchor: href.slice(1) };
        } else if (href.startsWith('http')) {
          intent = 'nav.external';
          payload = { url: href };
        } else if (href.startsWith('/')) {
          intent = 'nav.goto';
          payload = { path: href };
        }
      }
      
      if (!intent) {
        // Infer from text
        const text = (el.textContent || '').toLowerCase();
        if (/sign\\s*in|login/.test(text)) intent = 'auth.signin';
        else if (/sign\\s*up|register/.test(text)) intent = 'auth.signup';
        else if (/add\\s*to\\s*cart/.test(text)) intent = 'cart.add';
        else if (/view\\s*cart|cart/.test(text)) intent = 'cart.view';
        else if (/book|schedule/.test(text)) intent = 'booking.create';
        else if (/contact/.test(text)) intent = 'overlay.open', payload = { type: 'contact' };
        else if (/learn\\s*more/.test(text)) intent = 'nav.anchor', payload = { anchor: 'features' };
      }
      
      if (intent) {
        e.preventDefault();
        e.stopPropagation();
        // Extract data attributes
        for (const attr of el.attributes) {
          if (attr.name.startsWith('data-') && attr.name !== 'data-ut-intent') {
            const key = attr.name.slice(5).replace(/-/g, '');
            payload[key] = attr.value;
          }
        }
        await executeIntent(intent, payload);
      }
    };
    
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);
  
  const value = {
    siteBundle,
    navigate,
    executeIntent,
    cmsState,
    overlay,
    openOverlay,
    closeOverlay,
    addToCart,
    removeFromCart,
    clearCart,
  };
  
  return (
    <PreviewContext.Provider value={value}>
      <OverlayContainer>
        {children}
      </OverlayContainer>
    </PreviewContext.Provider>
  );
}

// ============================================================================
// Main App
// ============================================================================

export default function App() {
  return (
    <PreviewRuntimeProvider siteBundle={siteBundle}>
      <Routes>
${routes}
        <Route path="*" element={<Navigate to="${entryPath}" replace />} />
      </Routes>
    </PreviewRuntimeProvider>
  );
}
`.trim();
}

/**
 * Generate a page component file from PageBundle — uses native JSX
 */
function generatePageFile(page: PageBundle): string {
  const componentName = sanitizeComponentName(page.path);
  const htmlContent = page.output?.html || '<div>Page content not generated</div>';
  
  // Convert HTML to JSX-compatible markup
  const jsxContent = htmlContent
    .replace(/ class="/g, ' className="')
    .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
    .replace(/<br>/gi, '<br />')
    .replace(/<hr>/gi, '<hr />')
    .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />');
  
  return `
import React from 'react';

export default function ${componentName}() {
  return (
    <div className="page-container">
      ${jsxContent}
    </div>
  );
}
`.trim();
}

/**
 * Generate index.html
 */
function generateIndexHtml(debug: boolean): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
  <div id="root"></div>
  ${debug ? '<script>console.log("[Preview] Debug mode enabled");</script>' : ''}
</body>
</html>
`.trim();
}

/**
 * Generate CSS styles for overlays and common elements
 */
function generateStyles(): string {
  return `
/* Preview Runtime Styles */

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-container {
  min-height: 100vh;
}

/* Overlay System */
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
  animation: fadeIn 0.2s ease;
}

.overlay-container {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.overlay-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 400px;
  animation: zoomIn 0.2s ease;
}

.overlay-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.overlay-header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.overlay-header button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
}

.overlay-body {
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.overlay-footer {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Form Elements */
.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 0.625rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  flex: 1;
  padding: 0.625rem 1rem;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
}

.btn-row {
  display: flex;
  gap: 0.5rem;
}

/* Cart */
.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.cart-item small {
  display: block;
  color: #6b7280;
}

.cart-total {
  font-weight: 600;
  text-align: right;
}

/* Utilities */
.text-center {
  text-align: center;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}

.code-block {
  background: #f3f4f6;
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  overflow-x: auto;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoomIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .overlay-card {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .overlay-header {
    border-color: #374151;
  }
  
  .overlay-header button {
    color: #9ca3af;
  }
  
  .overlay-footer {
    border-color: #374151;
  }
  
  .input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .btn-secondary {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .cart-item {
    border-color: #374151;
  }
  
  .code-block {
    background: #111827;
  }
}
`.trim();
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Sanitize path to valid filename
 */
function sanitizeFilename(path: string): string {
  if (path === '/' || path === '') return 'Home';
  return path
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/^-+|-+$/g, '') || 'Page';
}

/**
 * Sanitize path to valid React component name
 */
function sanitizeComponentName(path: string): string {
  const filename = sanitizeFilename(path);
  // Ensure starts with capital letter
  return filename.charAt(0).toUpperCase() + filename.slice(1) + 'Page';
}

// ============================================================================
// Export
// ============================================================================

export default generateSandpackFiles;
