/**
 * Sandpack File Preparation Utilities
 * 
 * THE canonical preview compiler for Unison Tasks.
 * 
 * Sandpack's react-ts template expects files at ROOT level (e.g., /App.tsx, not /src/App.tsx).
 * Entry point MUST be /index.tsx (not /main.tsx) — Sandpack react-ts uses /index.tsx.
 * This module flattens VFS paths, processes imports, and ensures essential files exist.
 * 
 * CRITICAL GUARANTEE: Wizard Launcher NEVER generates component stubs.
 * Every missing component is auto-injected with a real industry-appropriate UI chip
 * from the detected industry's template toolkit (menu, treatments, classes, products, etc).
 * This ensures stable, high-quality preview rendering across all industries.
 *
 * Pipeline:
 *   Launcher → normalizeLauncherFiles() → source VFS
 *   source VFS → prepareSandpackFiles() → Sandpack overlay
 *   or:
 *   Launcher → compileLauncherOutputForPreview() → Sandpack overlay (combines both steps)
 */

import { ensureReactImports, sanitizeSvgElements } from '@/utils/aiCodeCleaner';
import { LAUNCHER_BASE_THEME } from '@/sections/themes';
import { SANDPACK_ALLOWED_IMPORTS } from '@/utils/sandpackDependencies';
import { isValidAesthetic } from '@/utils/aestheticToCSS';
import { buildDefaultThemedIndexCss, buildThemedIndexCss, DEFAULT_PREVIEW_THEME_PRESET } from '@/components/onboarding/themePresetToIndexCss';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';

const ALLOWED_IMPORTS = SANDPACK_ALLOWED_IMPORTS;

const LAUNCHER_THEME_JSON = JSON.stringify(LAUNCHER_BASE_THEME, null, 2);

/**
 * Build a fallback /src/index.css from a wizard ThemePreset id.
 * This unifies all CSS-injection sites on a SINGLE wizard-driven token system.
 * No path may hard-code 'modern' — the resolved preset (from wizard pick or
 * industry default) MUST flow through to here.
 */
function buildBaseCssForPreset(presetId?: string | null): string {
  const preset = (presetId && THEME_PRESETS.find((p) => p.id === presetId)) || DEFAULT_PREVIEW_THEME_PRESET;
  return buildThemedIndexCss(preset);
}

const BASE_CSS = buildDefaultThemedIndexCss();

/** Extract just the :root { ... } block for prepend-only paths */
const SEMANTIC_CSS_VARS = (BASE_CSS.match(/:root\s*\{[^}]*\}/) ?? [''])[0] + '\n';

/**
 * index.html with Tailwind CDN configured to recognize semantic design tokens.
 * Without this config, classes like bg-primary, text-foreground, bg-muted etc.
 * are unknown to the CDN and compile to nothing — causing invisible elements.
 */
const PREVIEW_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            border: 'hsl(var(--border))',
            input: 'hsl(var(--input))',
            ring: 'hsl(var(--ring))',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            primary: {
              DEFAULT: 'hsl(var(--primary))',
              foreground: 'hsl(var(--primary-foreground))',
            },
            secondary: {
              DEFAULT: 'hsl(var(--secondary))',
              foreground: 'hsl(var(--secondary-foreground))',
            },
            destructive: {
              DEFAULT: 'hsl(var(--destructive))',
              foreground: 'hsl(var(--destructive-foreground))',
            },
            muted: {
              DEFAULT: 'hsl(var(--muted))',
              foreground: 'hsl(var(--muted-foreground))',
            },
            accent: {
              DEFAULT: 'hsl(var(--accent))',
              foreground: 'hsl(var(--accent-foreground))',
            },
            popover: {
              DEFAULT: 'hsl(var(--popover))',
              foreground: 'hsl(var(--popover-foreground))',
            },
            card: {
              DEFAULT: 'hsl(var(--card))',
              foreground: 'hsl(var(--card-foreground))',
            },
          },
          borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)',
          },
          fontFamily: {
            heading: ['var(--font-heading)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            serif: ['var(--font-heading)', 'ui-serif', 'Georgia', 'serif'],
          },
        },
      },
    }
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;


const PREVIEW_NAV_BRIDGE = `function __initLovablePreviewNavBridge() {
  const bridgeWindow = window as Window & { __lovablePreviewNavBridgeInstalled?: boolean };
  if (bridgeWindow.__lovablePreviewNavBridgeInstalled) return;
  bridgeWindow.__lovablePreviewNavBridgeInstalled = true;

  const normalizePath = (rawPath: string) => rawPath.replace(/^\\//, '').replace(/\\.html(?:[?#].*)?$/, '').replace(/[?#].*$/, '') || 'index';

  // ── In-preview action helpers ─────────────────────────────────────────────

  /** Render a transient feedback toast directly inside the preview iframe */
  function __showPreviewFeedback(message: string, bgColor: string) {
    const existing = document.getElementById('__ut-preview-feedback');
    if (existing) existing.remove();
    const fb = document.createElement('div');
    fb.id = '__ut-preview-feedback';
    fb.setAttribute('style',
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);' +
      'background:' + (bgColor || '#18181b') + ';color:#fff;padding:10px 18px;' +
      'border-radius:8px;font-size:13px;font-weight:500;z-index:99999;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.25);pointer-events:none;' +
      'transition:opacity 0.25s ease;white-space:nowrap;'
    );
    fb.textContent = message;
    document.body.appendChild(fb);
    setTimeout(function() { fb.style.opacity = '0'; setTimeout(function() { fb.remove(); }, 250); }, 2200);
  }

  /** Priority-ordered CSS selector lists for each canonical intent's target section */
  function __intentSelectors(intent: string): string[] {
    const MAP: Record<string, string[]> = {
      'booking.create':       ['form[data-ut-intent="booking.create"]','[data-ut-intent="booking.create"]:not(button):not(a)','form[data-ut-intent*="booking"]','#booking','[id*="booking-form"]','[class*="booking-form"]','section[id*="book"]','.booking'],
      'contact.submit':       ['form[data-ut-intent="contact.submit"]','[data-ut-intent="contact.submit"]:not(button):not(a)','form[data-ut-intent*="contact"]','#contact','[id*="contact-form"]','[class*="contact-form"]','section[id*="contact"]','.contact-section'],
      'newsletter.subscribe': ['form[data-ut-intent="newsletter.subscribe"]','[data-ut-intent="newsletter.subscribe"]:not(button):not(a)','form[data-ut-intent*="newsletter"]','#newsletter','[id*="newsletter"]','[class*="newsletter"]','input[type="email"]'],
      'quote.request':        ['form[data-ut-intent="quote.request"]','[data-ut-intent="quote.request"]:not(button):not(a)','form[data-ut-intent*="quote"]','#quote','[id*="quote-form"]','[class*="quote-form"]','section[id*="quote"]'],
      'lead.capture':         ['form[data-ut-intent="lead.capture"]','[data-ut-intent="lead.capture"]:not(button):not(a)','form[data-ut-intent*="lead"]','#lead','#contact','[id*="lead-form"]','input[type="email"]'],
      'auth.login':           ['form[data-ut-intent="auth.login"]','[data-ut-intent="auth.login"]:not(button):not(a)','form[data-ut-intent*="auth"]','#login','#auth','[id*="login-form"]','[class*="auth-form"]'],
      'auth.register':        ['form[data-ut-intent="auth.register"]','[data-ut-intent="auth.register"]:not(button):not(a)','form[data-ut-intent*="register"]','#register','#signup','[id*="register-form"]','[class*="auth-form"]'],
      'pay.checkout':         ['[data-ut-intent="pay.checkout"]:not(button):not(a)','#pricing','[id*="pricing"]','[class*="pricing-section"]','#checkout','[class*="checkout"]'],
      'cart.checkout':        ['[data-ut-intent="cart.checkout"]:not(button):not(a)','#cart','[id*="cart"]','[class*="cart-section"]','#checkout','[class*="checkout"]'],
    };
    return MAP[intent] || [];
  }

  /** Find the best scroll-target element for an intent, skipping the clicked element */
  function __findIntentTarget(intent: string, clicked: Element): Element | null {
    for (const sel of __intentSelectors(intent)) {
      const found = Array.from(document.querySelectorAll(sel)).find(function(t) {
        return t !== clicked && !t.contains(clicked) && !clicked.contains(t);
      });
      if (found) return found;
    }
    return null;
  }

  /**
   * Build a lightweight inventory of what UI sections/forms currently exist on the page.
   * Sent with every INTENT_TRIGGER so the parent can make smarter routing decisions
   * without having to re-parse the VFS source.
   */
  function __buildPageInventory(): Record<string, unknown> {
    // Collect all unique data-ut-intent values present on page (not buttons/anchors — structural elements)
    const sectionIntents = Array.from(
      new Set(
        Array.from(document.querySelectorAll('[data-ut-intent]:not(button):not(a)'))
          .map(function(e) { return e.getAttribute('data-ut-intent'); })
          .filter(Boolean)
      )
    );
    // Collect important landmark IDs
    const LANDMARK_IDS = ['pricing','booking','contact','newsletter','hero','features','services','about','team','gallery','faq','testimonials','portfolio','products','shop','cart','checkout','login','signup','register','auth'];
    const presentIds = LANDMARK_IDS.filter(function(id) { return !!document.getElementById(id); });
    // Detect forms by their intent
    const formIntents = Array.from(
      new Set(
        Array.from(document.querySelectorAll('form[data-ut-intent]'))
          .map(function(e) { return e.getAttribute('data-ut-intent'); })
          .filter(Boolean)
      )
    );
    // Detect nav links (page names discoverable without generating)
    const navHrefs = Array.from(
      new Set(
        Array.from(document.querySelectorAll('nav a[href], header a[href]'))
          .map(function(e) {
            const h = e.getAttribute('href') || '';
            return h.replace(/^#\\//, '/').replace(/^\\//, '').replace(/\\.html$/, '').replace(/[?#].*$/, '').toLowerCase().trim();
          })
          .filter(function(h) { return h && h !== '' && h !== 'index' && !h.startsWith('http'); })
      )
    );
    return { sectionIntents, presentIds, formIntents, navHrefs };
  }

  /**
   * Attempt an in-preview UI action for the given intent.
   * Returns true if an action was taken so the parent can skip its own duplicate feedback.
   */
  function __handleIntentInPreview(intent: string, clicked: Element): boolean {
    // Visual-feedback-only intents
    if (intent === 'cart.add') {
      __showPreviewFeedback('Added to cart \u2713', '#16a34a');
      return true;
    }
    if (intent === 'form.submit') {
      __showPreviewFeedback('Submitted \u2713', '#2563eb');
      return true;
    }
    // Scroll-to-section intents
    const target = __findIntentTarget(intent, clicked);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the first relevant input inside the target section after scroll settles
      const input = (target as HTMLElement).querySelector(
        'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea'
      ) as HTMLElement | null;
      if (input) setTimeout(function() { input.focus(); }, 480);
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  document.addEventListener('click', function (event) {
    const target = event.target as HTMLElement | null;
    const el = target?.closest?.('a[href], [data-ut-intent], [data-ut-path], button[data-ut-intent]') as HTMLElement | null;
    if (!el) return;

    const utIntent = el.getAttribute('data-ut-intent') || '';
    const path = el.getAttribute('data-ut-path') || el.getAttribute('href') || '';

    // ── Action intents: execute in-preview first, then notify parent ──
    if (utIntent && utIntent !== 'nav.goto' && utIntent !== 'nav.goto_page' && utIntent !== 'nav.anchor' && utIntent !== 'nav.external') {
      event.preventDefault();
      event.stopPropagation();
      const reqId = 'intent-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const intentPayload: Record<string, unknown> = {};
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-ut-') && attr.name !== 'data-ut-intent') {
          intentPayload[attr.name.replace('data-ut-', '')] = attr.value;
        }
      }
      intentPayload.buttonLabel = el.textContent ? el.textContent.trim().substring(0, 60) : '';
      intentPayload.source = 'preview';
      // Attempt the direct in-preview action; tell the parent whether we handled it
      intentPayload.inPreviewHandled = __handleIntentInPreview(utIntent, el);
      // Send a lightweight DOM inventory so the parent can route intelligently
      intentPayload.pageInventory = __buildPageInventory();
      window.parent.postMessage({
        type: 'INTENT_TRIGGER',
        intent: utIntent,
        payload: intentPayload,
        requestId: reqId,
      }, '*');
      return;
    }

    // ── nav.goto / nav.goto_page: navigate directly via hash router ──
    if (utIntent === 'nav.goto' || utIntent === 'nav.goto_page') {
      event.preventDefault();
      event.stopPropagation();
      const navPath = el.getAttribute('data-ut-path') || path;
      const targetPageId = el.getAttribute('data-ut-target-page-id');
      if (navPath && navPath !== '#') {
        const route = navPath.startsWith('/') ? navPath : '/' + navPath;
        window.location.hash = route;
      } else if (targetPageId) {
        // Fallback: ask parent to resolve page ID to route
        window.parent.postMessage({
          type: 'INTENT_TRIGGER',
          intent: 'nav.goto_page',
          payload: { targetPageId, buttonLabel: el.textContent?.trim()?.substring(0, 40) || '', source: 'preview' },
          requestId: 'nav-' + Date.now(),
        }, '*');
      }
      return;
    }

    // ── Anchor scroll ──
    if (!path || path === '#' || path.startsWith('http') || path.startsWith('mailto:') || path.startsWith('tel:') || path.startsWith('javascript:')) return;

    if (path.startsWith('#') && !path.startsWith('#/')) {
      const section = document.querySelector(path);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
      }
      return;
    }

    // ── Hash route links (e.g. href="#/services") — navigate directly ──
    if (path.startsWith('#/')) {
      event.preventDefault();
      window.location.hash = path.substring(1);
      return;
    }

    const pageName = normalizePath(path);
    if (pageName === 'index') return;

    event.preventDefault();
    event.stopPropagation();

    const targetRoute = '/' + pageName;

    // Check if this page exists in the hash router by trying hash navigation first
    // The router will render a fallback/404 if it doesn't exist
    const targetPageId = el.getAttribute('data-ut-target-page-id');
    if (targetPageId) {
      window.location.hash = targetRoute;
      return;
    }

    // Try direct hash navigation — if the route is in the router it renders immediately
    window.location.hash = targetRoute;

    // Also notify parent so it can generate the page if missing
    window.parent.postMessage({
      type: 'NAV_PAGE_GENERATE',
      pageName,
      navLabel: el.textContent ? el.textContent.trim().substring(0, 40) : pageName,
      requestId: 'click-' + Date.now(),
    }, '*');
  }, true);

  // ── Form submission bridge: intercept forms with data-ut-intent ──
  document.addEventListener('submit', function (event) {
    const form = event.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    const formIntent = form.getAttribute('data-ut-intent');
    if (!formIntent) return;
    event.preventDefault();
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => { payload[key] = value.toString(); });
    payload.source = 'preview-form';
    // Show immediate in-preview confirmation
    __showPreviewFeedback('Submitted \u2713', '#2563eb');
    window.parent.postMessage({
      type: 'INTENT_TRIGGER',
      intent: formIntent,
      payload,
      requestId: 'form-' + Date.now(),
    }, '*');
  }, true);

  // ── Message handlers for navigation and intent commands ──
  window.addEventListener('message', function (event) {
    if (event.data?.type === 'NAV_ROUTE' && event.data.route) {
      window.location.hash = event.data.route;
    }
    // Handle intent-based scroll/focus commands from parent
    if (event.data?.type === 'INTENT_COMMAND') {
      const { command, requestId: cmdReqId } = event.data;
      let handled = false;
      // Derive the canonical intent from the command name
      // e.g. "booking.scroll" → "booking.create", "contact.scroll" → "contact.submit"
      const intentKey: string = (
        command === 'booking.scroll'     ? 'booking.create'       :
        command === 'contact.scroll'     ? 'contact.submit'       :
        command === 'newsletter.scroll'  ? 'newsletter.subscribe' :
        command === 'quote.scroll'       ? 'quote.request'        :
        command === 'lead.scroll'        ? 'lead.capture'         :
        command === 'auth.scroll'        ? 'auth.login'           :
        command === 'checkout.scroll'    ? 'pay.checkout'         :
        command
      );
      const target = __findIntentTarget(intentKey, document.documentElement);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        handled = true;
      }
      window.parent.postMessage({ type: 'INTENT_COMMAND_RESULT', command, requestId: cmdReqId, handled }, '*');
    }
  });
}
`;

/**
 * PREVIEW_SELECTION_BRIDGE — element selection bridge for the Web Builder
 * "Edit / Select" mode. Injected into Sandpack's /index.tsx alongside the
 * navigation bridge.
 *
 * Responsibilities:
 *  - Listen for EDIT_MODE_TOGGLE from the parent (with an activationKey).
 *  - When active: install hover outline + click capture that suppresses
 *    default navigation/intents and posts ELEMENT_SELECTED to the parent
 *    with a stable selector + minimal element metadata.
 *  - When inactive: tear everything down so the preview behaves normally.
 *
 * This is the missing half of the Edit-mode wiring referenced in
 * mem://features/web-builder/edit-mode-selection-bridge — the parent already
 * had ElementFloatingToolbar and onElementSelect plumbing, but no script in
 * the iframe ever produced the ELEMENT_SELECTED message.
 */
const PREVIEW_SELECTION_BRIDGE = `function __initLovablePreviewSelectionBridge() {
  const bridgeWindow = window as Window & { __lovablePreviewSelectionBridgeInstalled?: boolean };
  if (bridgeWindow.__lovablePreviewSelectionBridgeInstalled) return;
  bridgeWindow.__lovablePreviewSelectionBridgeInstalled = true;

  let active = false;
  let activationKey = 0;
  let hoverEl: HTMLElement | null = null;
  let selectedEl: HTMLElement | null = null;

  const STYLE_ID = '__ut-select-style';
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.__ut-hover { outline: 2px dashed hsl(190 95% 55%) !important; outline-offset: 2px !important; cursor: pointer !important; }',
      '.__ut-selected { outline: 2px solid hsl(190 95% 55%) !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px hsla(190, 95%, 55%, 0.18) !important; }',
      'html.__ut-select-mode, html.__ut-select-mode body { cursor: crosshair !important; }',
    ].join('\\n');
    document.head.appendChild(style);
  }

  function clearHover() { if (hoverEl) { hoverEl.classList.remove('__ut-hover'); hoverEl = null; } }
  function clearSelected() { if (selectedEl) { selectedEl.classList.remove('__ut-selected'); selectedEl = null; } }

  function cssEscape(s: string): string {
    return (window as any).CSS && (window as any).CSS.escape
      ? (window as any).CSS.escape(s)
      : s.replace(/([^\\\\w-])/g, '\\\\$1');
  }
  function computeSelector(el: Element): string {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    if ((el as HTMLElement).id) return '#' + cssEscape((el as HTMLElement).id);
    const dataKey = el.getAttribute('data-ut-key');
    if (dataKey) return '[data-ut-key="' + cssEscape(dataKey) + '"]';
    const dataBinding = el.getAttribute('data-ut-binding-id');
    if (dataBinding) return '[data-ut-binding-id="' + cssEscape(dataBinding) + '"]';
    const bindingKey = el.getAttribute('data-ut-binding-key') || el.getAttribute('data-element-key');
    if (bindingKey) return '[data-ut-binding-key="' + cssEscape(bindingKey) + '"], [data-element-key="' + cssEscape(bindingKey) + '"]';
    const componentInstanceId = el.getAttribute('data-ut-component-instance-id');
    if (componentInstanceId) return '[data-ut-component-instance-id="' + cssEscape(componentInstanceId) + '"]';
    const componentSlug = el.getAttribute('data-component');
    if (componentSlug) return '[data-component="' + cssEscape(componentSlug) + '"]';
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node !== document.body && depth < 6) {
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) { parts.unshift(tag); break; }
      const sameTag = Array.from(parent.children).filter(c => c.tagName === node!.tagName);
      if (sameTag.length === 1) {
        parts.unshift(tag);
      } else {
        const idx = sameTag.indexOf(node) + 1;
        parts.unshift(tag + ':nth-of-type(' + idx + ')');
      }
      node = parent;
      depth++;
    }
    return parts.join(' > ');
  }

  function findSection(el: Element): string | null {
    let cur: Element | null = el;
    while (cur && cur !== document.body) {
      if (cur.tagName === 'SECTION') {
        return cur.getAttribute('id') || cur.getAttribute('data-section') || cur.tagName.toLowerCase();
      }
      const dataSection = cur.getAttribute('data-section') || cur.getAttribute('data-ut-section');
      if (dataSection) return dataSection;
      cur = cur.parentElement;
    }
    return null;
  }

  function snapshotStyles(el: Element): Record<string, string> {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color, backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle, fontFamily: cs.fontFamily,
      textDecoration: cs.textDecoration, textAlign: cs.textAlign,
      padding: cs.padding, margin: cs.margin, borderRadius: cs.borderRadius,
    };
  }

  function snapshotAttrs(el: Element): Record<string, string> {
    const out: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) out[a.name] = a.value;
    return out;
  }

  function isUiChrome(el: Element | null): boolean {
    if (!el) return true;
    const id = (el as HTMLElement).id || '';
    if (id.startsWith('__ut-')) return true;
    return false;
  }

  function onMouseOver(e: MouseEvent) {
    if (!active) return;
    const t = e.target as HTMLElement | null;
    if (!t || isUiChrome(t) || t === hoverEl) return;
    clearHover();
    hoverEl = t;
    t.classList.add('__ut-hover');
  }
  function onMouseOut(e: MouseEvent) {
    if (!active) return;
    if (e.target === hoverEl) clearHover();
  }
  function onClickCapture(e: MouseEvent) {
    if (!active) return;
    const t = e.target as HTMLElement | null;
    if (!t || isUiChrome(t)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof (e as any).stopImmediatePropagation === 'function') (e as any).stopImmediatePropagation();
    clearHover();
    clearSelected();
    selectedEl = t;
    t.classList.add('__ut-selected');
    const selector = computeSelector(t);
    const html = t.outerHTML.length > 4000 ? t.outerHTML.slice(0, 4000) : t.outerHTML;
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      activationKey,
      element: {
        tagName: t.tagName.toLowerCase(),
        textContent: (t.textContent || '').trim().slice(0, 500),
        selector, html,
        styles: snapshotStyles(t),
        attributes: snapshotAttrs(t),
        section: findSection(t),
      },
    }, '*');
  }

  function activate() {
    if (active) return;
    active = true;
    ensureStyles();
    document.documentElement.classList.add('__ut-select-mode');
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClickCapture, true);
  }
  function deactivate() {
    if (!active) return;
    active = false;
    clearHover();
    clearSelected();
    document.documentElement.classList.remove('__ut-select-mode');
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClickCapture, true);
  }

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'EDIT_MODE_TOGGLE') {
      activationKey = typeof data.activationKey === 'number' ? data.activationKey : activationKey + 1;
      if (data.enabled) activate(); else deactivate();
      window.parent.postMessage({ type: 'EDIT_MODE_READY', activationKey, enabled: !!data.enabled }, '*');
    }
    if (data.type === 'EDIT_MODE_CLEAR_SELECTION') {
      clearSelected();
    }
  });

  window.parent.postMessage({ type: 'EDIT_MODE_BRIDGE_READY' }, '*');
}
`;

/**
 * DEFAULT_INDEX — the canonical Sandpack entry point.
 * Sandpack react-ts uses /index.tsx, NOT /main.tsx.
 */
const DEFAULT_INDEX = `import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import * as __JsxRuntime from 'react/jsx-runtime';
import * as __JsxDevRuntime from 'react/jsx-dev-runtime';
import * as AppModule from './App';
import './index.css';
import { HashRouter as __PreviewHashRouter, useInRouterContext as __useInRouterContext } from 'react-router-dom';
const __RouterGuard = ({ children }: { children: React.ReactNode }) => {
  let inRouter = false;
  try { inRouter = __useInRouterContext(); } catch { inRouter = false; }
  return inRouter ? <>{children}</> : <__PreviewHashRouter>{children}</__PreviewHashRouter>;
};


// ── Runtime guard: intercept undefined components BEFORE they crash React ──
// This prevents "Element type is invalid" errors by replacing undefined/null
// component references with a visible placeholder instead of a hard crash.
const _origCreateElement = React.createElement;
const _undefinedComponents = new Set<string>();
const _badChildLogged = new Set<string>();
function _sanitizeChild(child: any): any {
  if (child == null || typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') return child;
  if (Array.isArray(child)) return child.map(_sanitizeChild);
  if (typeof child === 'object') {
    // Valid React element
    if ((child as any).$$typeof) return child;
    // Plain object accidentally rendered as child — unwrap common shapes
    const keys = Object.keys(child);
    const sig = keys.sort().join(',');
    if (!_badChildLogged.has(sig)) {
      _badChildLogged.add(sig);
      console.error('[Preview] Non-renderable object child intercepted. Keys:', keys);
    }
    if ('children' in child) return _sanitizeChild((child as any).children);
    if ('text' in child || 'label' in child || 'title' in child) {
      return String((child as any).text ?? (child as any).label ?? (child as any).title ?? '');
    }
    // Last resort: stringify so React doesn't crash
    try { return JSON.stringify(child); } catch { return ''; }
  }
  return child;
}
// Wrap function components so their RETURN value is sanitized too.
// Catches "Objects are not valid as a React child" thrown at mount when a
// component returns a plain object (e.g. { children: ... }) instead of JSX.
const _wrappedComponentCache = new WeakMap<any, any>();
// React Router (and similar libs) rely on REFERENCE EQUALITY of child.type
// (e.g. Routes validates each child is the literal Route export).
// Wrapping these would break that check with errors like:
//   "[_SafeFC] is not a Route component"
// Skip wrapping for known router/library components AND for anything whose
// displayName/name starts with an uppercase letter and is in our skip list.
const _SKIP_WRAP_NAMES = new Set([
  'Route','Routes','Router','BrowserRouter','HashRouter','MemoryRouter',
  'Outlet','Navigate','Switch','Link','NavLink','RouterProvider',
  'Suspense','Fragment','Profiler','StrictMode',
  'AnimatePresence','MotionConfig','LazyMotion','Reorder',
]);
function _wrapComponent(type: any): any {
  if (typeof type !== 'function') return type;
  // Skip class components (they have a prototype with isReactComponent)
  if (type.prototype && type.prototype.isReactComponent) return type;
  // Skip components requiring reference identity (router, framer, etc.)
  const name = (type as any).displayName || (type as any).name;
  if (name && _SKIP_WRAP_NAMES.has(name)) return type;
  // Skip forwardRef / memo / context objects (already non-function or special)
  if ((type as any).$$typeof) return type;
  const cached = _wrappedComponentCache.get(type);
  if (cached) return cached;
  const Wrapped = function _SafeFC(props: any, ref: any) {
    let result;
    try { result = (type as any)(props, ref); } catch (e) { throw e; }
    if (result == null || typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') return result;
    if (typeof result === 'object' && (result as any).$$typeof) return result;
    if (Array.isArray(result)) return result.map(_sanitizeChild);
    // Plain object returned — sanitize it like a child
    return _sanitizeChild(result);
  };
  try { (Wrapped as any).displayName = (type as any).displayName || (type as any).name || 'SafeFC'; } catch {}
  _wrappedComponentCache.set(type, Wrapped);
  return Wrapped;
}

(React as any).createElement = function SafeCreateElement(type: any, props: any, ...children: any[]) {
  if (type === undefined || type === null) {
    const caller = new Error().stack?.split('\\n')[2]?.trim() || 'unknown';
    const id = caller.slice(0, 80);
    if (!_undefinedComponents.has(id)) {
      _undefinedComponents.add(id);
      console.error('[Preview] Undefined component intercepted. Caller:', caller);
    }
    return _origCreateElement('div', {
      style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', margin: 2, borderRadius: 6, border: '1px dashed hsl(0 60% 50%)', background: 'hsl(0 60% 97%)', color: 'hsl(0 60% 40%)', fontSize: 11, fontFamily: 'monospace' },
      title: 'This component resolved to undefined — check imports',
    }, '⚠ missing component');
  }
  // Sanitize children to prevent "Objects are not valid as a React child" crashes
  const safeChildren = children.map(_sanitizeChild);
  // Also sanitize props.children if no explicit children passed
  if (safeChildren.length === 0 && props && typeof props === 'object' && 'children' in props) {
    const sanitized = _sanitizeChild((props as any).children);
    if (sanitized !== (props as any).children) {
      props = { ...props, children: sanitized };
    }
  }
  return _origCreateElement(_wrapComponent(type), props, ...safeChildren);
};

// ── Patch react/jsx-runtime so the modern JSX transform also gets sanitized ──
// Vite/SWC/Babel "automatic" JSX compiles to jsx()/jsxs()/jsxDEV() which
// bypass React.createElement entirely. Without this, our sanitizer is dead
// weight against the "Objects are not valid as a React child" crash.
try {
  const __jsxRT: any = __JsxRuntime;
  const __jsxDEVRT: any = __JsxDevRuntime;
  const __makePlaceholder = () => _origCreateElement('div', {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', margin: 2, borderRadius: 6, border: '1px dashed hsl(0 60% 50%)', background: 'hsl(0 60% 97%)', color: 'hsl(0 60% 40%)', fontSize: 11, fontFamily: 'monospace' },
    title: 'This component resolved to undefined — check imports',
  }, '⚠ missing component');
  const __wrapJsx = (orig: any) => function PatchedJsx(type: any, props: any, key: any) {
    if (type === undefined || type === null) return __makePlaceholder();
    if (props && typeof props === 'object' && 'children' in props) {
      const sanitized = _sanitizeChild((props as any).children);
      if (sanitized !== (props as any).children) {
        props = { ...props, children: sanitized };
      }
    }
    return orig(_wrapComponent(type), props, key);
  };
  if (__jsxRT) {
    if (typeof __jsxRT.jsx === 'function') __jsxRT.jsx = __wrapJsx(__jsxRT.jsx);
    if (typeof __jsxRT.jsxs === 'function') __jsxRT.jsxs = __wrapJsx(__jsxRT.jsxs);
  }
  if (__jsxDEVRT && typeof __jsxDEVRT.jsxDEV === 'function') {
    const origDev = __jsxDEVRT.jsxDEV;
    __jsxDEVRT.jsxDEV = function PatchedJsxDEV(type: any, props: any, key: any, isStatic: any, source: any, self: any) {
      if (type === undefined || type === null) return __makePlaceholder();
      if (props && typeof props === 'object' && 'children' in props) {
        const sanitized = _sanitizeChild((props as any).children);
        if (sanitized !== (props as any).children) {
          props = { ...props, children: sanitized };
        }
      }
      return origDev(_wrapComponent(type), props, key, isStatic, source, self);
    };
  }
} catch (e) {
  console.warn('[Preview] Failed to patch jsx-runtime:', e);
}

// ── Robust App resolution: handle default + named exports gracefully ──
const App = (() => {
  if (AppModule.default && (typeof AppModule.default === 'function' || (typeof AppModule.default === 'object' && (AppModule.default as any).$$typeof))) {
    return AppModule.default;
  }
  for (const [key, value] of Object.entries(AppModule)) {
    if (key === '__esModule' || key === 'default') continue;
    if (/^[A-Z]/.test(key) && (typeof value === 'function' || (typeof value === 'object' && value !== null && (value as any).$$typeof))) {
      return value;
    }
  }
  return null;
})();

// Configure Tailwind CDN with semantic design tokens
if (typeof window !== 'undefined' && (window as any).tailwind) {
  (window as any).tailwind.config = {
    theme: {
      extend: {
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
          secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
          destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
          muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
          accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
          popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
          card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
        fontFamily: {
          heading: 'var(--font-heading, ui-sans-serif, system-ui, sans-serif)',
          body: 'var(--font-body, ui-sans-serif, system-ui, sans-serif)',
        },
      },
    },
  };
}

${PREVIEW_NAV_BRIDGE}
__initLovablePreviewNavBridge();

${PREVIEW_SELECTION_BRIDGE}
__initLovablePreviewSelectionBridge();

// Error boundary as secondary safety net
class PreviewErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[Preview] Render crash:', error.message, info?.componentStack?.slice(0, 500));
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: 32, background: '#0a0a0a', color: '#e5e5e5' }
      },
        React.createElement('div', { style: { maxWidth: 480, textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: 48, marginBottom: 16 } }, '⚠️'),
          React.createElement('h2', { style: { fontSize: 20, fontWeight: 600, marginBottom: 8 } }, 'Preview render error'),
          React.createElement('p', { style: { color: '#a3a3a3', fontSize: 14, marginBottom: 16, lineHeight: 1.6 } }, this.state.error?.message || 'A component failed to render. This usually means an import resolved to undefined.'),
          React.createElement('details', { style: { textAlign: 'left', fontSize: 12, color: '#737373', marginBottom: 16 } },
            React.createElement('summary', { style: { cursor: 'pointer', marginBottom: 8 } }, 'Technical details'),
            React.createElement('pre', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, String(this.state.error?.stack || '').slice(0, 600))
          ),
          React.createElement('button', {
            onClick: () => { this.setState({ hasError: false, error: null }); },
            style: { padding: '8px 20px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#e5e5e5', cursor: 'pointer', fontSize: 14 }
          }, 'Retry')
        )
      );
    }
    return this.props.children;
  }
}

if (App) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PreviewErrorBoundary>
        <__RouterGuard>
          <App />
        </__RouterGuard>
      </PreviewErrorBoundary>
    </React.StrictMode>
  );
} else {
  // App module has no valid export — render diagnostic
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>No renderable component found</h2>
        <p style={{ color: '#888', fontSize: 14 }}>App.tsx does not export a valid React component. Check that it uses "export default" or a named PascalCase export.</p>
      </div>
    </div>
  );
}
`;

const HOOKS_SHIM = `
import { useState as reactUseState, useEffect as reactUseEffect, useCallback as reactUseCallback, useMemo as reactUseMemo, useRef as reactUseRef, useContext as reactUseContext, createContext } from 'react';

export const useState = reactUseState;
export const useEffect = reactUseEffect;
export const useCallback = reactUseCallback;
export const useMemo = reactUseMemo;
export const useRef = reactUseRef;
export const useContext = reactUseContext;

export const useToast = () => {
  const toast = (opts) => { console.log('[Toast]', opts.title, opts.description); };
  return { toast, dismiss: () => {} };
};
export const useMobile = () => false;
export const useSidebar = () => ({ open: false, toggle: () => {}, setOpen: () => {} });
export const useTheme = () => {
  const [theme, setTheme] = reactUseState('light');
  return { theme, setTheme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') };
};
export const useRouter = () => ({ push: () => {}, replace: () => {}, pathname: '/', back: () => {} });
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), () => {}];
export const useQuery = () => ({ data: null, loading: false, error: null, refetch: () => Promise.resolve() });
export const useMutation = () => [() => Promise.resolve(), { loading: false, error: null }];
export const useForm = () => ({ register: () => ({}), handleSubmit: (fn) => fn, watch: () => '', errors: {}, reset: () => {} });
export const useDebounce = (value) => value;
export const useLocalStorage = (key, initial) => {
  const [value, setValue] = reactUseState(initial);
  return [value, setValue];
};
export const useMediaQuery = () => false;
export const useOnClickOutside = () => {};
export const useWindowSize = () => ({ width: 1024, height: 768 });
export const useIntersectionObserver = () => ({ ref: { current: null }, inView: true });
export const useAnimation = () => ({ ref: { current: null }, controls: {} });
export const useReducer = (reducer, initial) => [initial, () => {}];
export const useLayoutEffect = reactUseEffect;
export const useAuth = () => ({
  user: null, session: null, loading: false, isAuthenticated: false,
  signIn: () => Promise.resolve({ error: 'Preview mode' }),
  signUp: () => Promise.resolve({ error: 'Preview mode' }),
  signOut: () => Promise.resolve(),
});
export const supabase = {
  auth: {
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Preview mode' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Preview mode' } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
};
export const useAssetRegistry = () => ({ assets: [], registerAsset: () => {}, getAsset: () => null, removeAsset: () => {} });
export const useSceneModel = () => ({ scene: null, updateScene: () => {}, selectedNode: null, selectNode: () => {} });
export const useDesignStudio = () => ({ scene: null, updateScene: () => {}, undo: () => {}, redo: () => {}, canUndo: false, canRedo: false });
export const useVirtualFileSystem = () => ({ files: {}, createFile: () => {}, updateFile: () => {}, deleteFile: () => {}, readFile: () => '' });
export const usePreviewSession = () => ({ session: null, isLoading: false, error: null, refresh: () => {} });
export const useAIFileAnalysis = () => ({ analyze: () => Promise.resolve({}), isAnalyzing: false });
export const useAITemplate = () => ({ generate: () => Promise.resolve(''), isGenerating: false });
export const useCodeHistory = () => ({ history: [], push: () => {}, undo: () => '', redo: () => '', canUndo: false, canRedo: false });
export const useDocument = () => ({ document: null, isLoading: false, save: () => Promise.resolve() });
export const useGoHighLevelCRM = () => ({ contacts: [], pipelines: [], isLoading: false });
export const useKeyboardShortcuts = () => {};
export const usePageGenerator = () => ({ generate: () => Promise.resolve(''), isGenerating: false });
export const useSubscription = () => ({ subscription: null, isLoading: false, tier: 'free' });
export const useCanvasHistory = () => ({ history: [], push: () => {}, undo: () => {}, redo: () => {}, canUndo: false, canRedo: false });
export const useTemplateAutomation = () => ({ automate: () => Promise.resolve(), isAutomating: false });
export const useTemplateFiles = () => ({ files: [], upload: () => Promise.resolve(), delete: () => Promise.resolve() });
export const useTemplateState = () => ({ state: {}, setState: () => {}, reset: () => {} });
export const useWebBuilder = () => ({ pages: [], components: [], addPage: () => {}, addComponent: () => {} });
export const useWebBuilderAI = () => ({ generate: () => Promise.resolve(''), isGenerating: false });
export const useWebBuilderState = () => ({ state: {}, setState: () => {} });
export const useWorkflowTrigger = () => ({ trigger: () => Promise.resolve(), isTriggering: false });
export const useCounter = (initial = 0) => { const [count, setCount] = reactUseState(initial); return { count, increment: () => setCount(c => c + 1), decrement: () => setCount(c => c - 1) }; };
export const useToggle = (initial = false) => { const [value, setValue] = reactUseState(initial); return [value, () => setValue(v => !v)]; };
export const useIntentHandlers = () => ({
  handleBooking: (service) => {
    const sel = 'form[data-ut-intent="booking.create"],form[data-ut-intent*="booking"],#booking,[id*="booking-form"],[class*="booking-form"],.booking';
    const el = document.querySelector(sel);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = el.querySelector('input:not([type="hidden"]):not([type="submit"]),textarea'); if (inp) setTimeout(() => (inp as HTMLElement).focus(), 480); }
    else console.log('[Intent] booking.create:', service);
  },
  handleContact: (data) => {
    const sel = 'form[data-ut-intent="contact.submit"],form[data-ut-intent*="contact"],#contact,[id*="contact-form"],[class*="contact-form"]';
    const el = document.querySelector(sel);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = el.querySelector('input:not([type="hidden"]):not([type="submit"]),textarea'); if (inp) setTimeout(() => (inp as HTMLElement).focus(), 480); }
    else console.log('[Intent] contact.submit:', data);
  },
  handleNewsletter: (email) => {
    const sel = 'form[data-ut-intent="newsletter.subscribe"],form[data-ut-intent*="newsletter"],#newsletter,[id*="newsletter"],[class*="newsletter"],input[type="email"]';
    const el = document.querySelector(sel);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = (el as HTMLElement).tagName === 'INPUT' ? el : el.querySelector('input[type="email"]'); if (inp) setTimeout(() => (inp as HTMLElement).focus(), 480); }
    else console.log('[Intent] newsletter.subscribe:', email);
  },
  handleNavigation: (path) => { const section = document.querySelector(path); if (section) section.scrollIntoView({ behavior: 'smooth' }); },
  handleAuth: (action) => {
    const sel = 'form[data-ut-intent^="auth."],#login,#auth,#register,[id*="login-form"],[class*="auth-form"]';
    const el = document.querySelector(sel);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = el.querySelector('input:not([type="hidden"]):not([type="submit"])'); if (inp) setTimeout(() => (inp as HTMLElement).focus(), 480); }
    else console.log('[Intent] auth.' + action);
  },
});
export const useNavigate = () => (path) => {
  if (path.startsWith('#')) {
    const el = document.querySelector(path);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Post to parent for page generation / routing
    const requestId = 'nav-' + Date.now();
    const pageName = path.replace(/^[/]/, '').replace(/[.]html$/, '') || 'index';
    window.parent.postMessage({
      type: 'NAV_PAGE_GENERATE',
      pageName,
      navLabel: pageName.charAt(0).toUpperCase() + pageName.slice(1),
      requestId,
    }, '*');
  }
};

export default {
  useState, useEffect, useCallback, useMemo, useRef, useContext,
  useToast, useMobile, useSidebar, useTheme, useAuth, useRouter,
  useParams, useSearchParams, useQuery, useMutation, useForm,
  useDebounce, useLocalStorage, useMediaQuery, useOnClickOutside,
  useWindowSize, useIntersectionObserver, useAnimation, useReducer,
  useLayoutEffect, useAssetRegistry, useSceneModel, useDesignStudio,
  useVirtualFileSystem, usePreviewSession, useAIFileAnalysis,
  useAITemplate, useCodeHistory, useDocument, useGoHighLevelCRM,
  useKeyboardShortcuts, usePageGenerator, useSubscription,
  useCanvasHistory, useTemplateAutomation, useTemplateFiles,
  useTemplateState, useWebBuilder, useWebBuilderAI, useWebBuilderState,
  useWorkflowTrigger, useCounter, useToggle, useIntentHandlers, useNavigate, supabase,
};
`;

// ── Lib/utils shim — provides real cn() function ─────────────────────────────
const LIB_UTILS_SHIM = `
export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
export function clsx(...args) {
  return args.flat(Infinity).filter(x => typeof x === 'string' && x).join(' ');
}
export default { cn, clsx };
`;

// ── UI components shim — provides real React component stubs ─────────────────
const UI_COMPONENTS_SHIM = `
import React from 'react';

// Utility
function cn(...inputs) { return inputs.filter(Boolean).join(' '); }

// Button
export function Button({ children, className, variant, size, asChild, ...props }) {
  return React.createElement('button', { className: cn('inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2', className), ...props }, children);
}

// Card
export function Card({ children, className, ...props }) { return React.createElement('div', { className: cn('rounded-lg border bg-card text-card-foreground shadow-sm', className), ...props }, children); }
export function CardHeader({ children, className, ...props }) { return React.createElement('div', { className: cn('flex flex-col space-y-1.5 p-6', className), ...props }, children); }
export function CardTitle({ children, className, ...props }) { return React.createElement('h3', { className: cn('text-2xl font-semibold leading-none tracking-tight', className), ...props }, children); }
export function CardDescription({ children, className, ...props }) { return React.createElement('p', { className: cn('text-sm text-muted-foreground', className), ...props }, children); }
export function CardContent({ children, className, ...props }) { return React.createElement('div', { className: cn('p-6 pt-0', className), ...props }, children); }
export function CardFooter({ children, className, ...props }) { return React.createElement('div', { className: cn('flex items-center p-6 pt-0', className), ...props }, children); }

// Input
export function Input({ className, type = 'text', ...props }) { return React.createElement('input', { type, className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...props }); }

// Label
export function Label({ children, className, ...props }) { return React.createElement('label', { className: cn('text-sm font-medium leading-none', className), ...props }, children); }

// Badge
export function Badge({ children, className, variant, ...props }) { return React.createElement('span', { className: cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', className), ...props }, children); }

// Separator
export function Separator({ className, orientation = 'horizontal', ...props }) { return React.createElement('div', { className: cn(orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', 'shrink-0 bg-border', className), ...props }); }

// Textarea
export function Textarea({ className, ...props }) { return React.createElement('textarea', { className: cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...props }); }

// Avatar
export function Avatar({ children, className, ...props }) { return React.createElement('span', { className: cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className), ...props }, children); }
export function AvatarImage({ src, alt, className, ...props }) { return React.createElement('img', { src, alt, className: cn('aspect-square h-full w-full', className), ...props }); }
export function AvatarFallback({ children, className, ...props }) { return React.createElement('span', { className: cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className), ...props }, children); }

// ScrollArea
export function ScrollArea({ children, className, ...props }) { return React.createElement('div', { className: cn('overflow-auto', className), ...props }, children); }

// Tabs
export function Tabs({ children, className, defaultValue, ...props }) { return React.createElement('div', { className, ...props }, children); }
export function TabsList({ children, className, ...props }) { return React.createElement('div', { className: cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1', className), ...props }, children); }
export function TabsTrigger({ children, className, value, ...props }) { return React.createElement('button', { className: cn('inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium', className), ...props }, children); }
export function TabsContent({ children, className, value, ...props }) { return React.createElement('div', { className, ...props }, children); }

// Dialog
export function Dialog({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DialogTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DialogContent({ children, className, ...props }) { return React.createElement('div', { className: cn('fixed inset-0 z-50 flex items-center justify-center', className), ...props }, children); }
export function DialogHeader({ children, className, ...props }) { return React.createElement('div', { className: cn('flex flex-col space-y-1.5 text-center sm:text-left', className), ...props }, children); }
export function DialogTitle({ children, className, ...props }) { return React.createElement('h2', { className: cn('text-lg font-semibold', className), ...props }, children); }
export function DialogDescription({ children, className, ...props }) { return React.createElement('p', { className: cn('text-sm text-muted-foreground', className), ...props }, children); }

// Sheet
export function Sheet({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function SheetTrigger({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function SheetContent({ children, className, ...props }) { return React.createElement('div', { className, ...props }, children); }

// Select  
export function Select({ children, ...props }) { return React.createElement('div', null, children); }
export function SelectTrigger({ children, className, ...props }) { return React.createElement('button', { className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm', className), ...props }, children); }
export function SelectValue({ placeholder, ...props }) { return React.createElement('span', props, placeholder); }
export function SelectContent({ children, ...props }) { return React.createElement('div', props, children); }
export function SelectItem({ children, value, ...props }) { return React.createElement('div', props, children); }

// Switch
export function Switch({ className, ...props }) { return React.createElement('button', { className: cn('peer inline-flex h-[24px] w-[44px] rounded-full border-2', className), role: 'switch', ...props }); }

// Accordion
export function Accordion({ children, ...props }) { return React.createElement('div', props, children); }
export function AccordionItem({ children, value, ...props }) { return React.createElement('div', props, children); }
export function AccordionTrigger({ children, ...props }) { return React.createElement('button', props, children); }
export function AccordionContent({ children, ...props }) { return React.createElement('div', props, children); }

// Progress
export function Progress({ value = 0, className, ...props }) { return React.createElement('div', { className: cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className), ...props }, React.createElement('div', { style: { width: value + '%' }, className: 'h-full bg-primary transition-all' })); }

// Tooltip
export function Tooltip({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function TooltipTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function TooltipContent({ children, ...props }) { return null; }
export function TooltipProvider({ children, ...props }) { return React.createElement(React.Fragment, null, children); }

// Skeleton
export function Skeleton({ className, ...props }) { return React.createElement('div', { className: cn('animate-pulse rounded-md bg-muted', className), ...props }); }

// Checkbox
export function Checkbox({ className, ...props }) { return React.createElement('input', { type: 'checkbox', className, ...props }); }

// RadioGroup
export function RadioGroup({ children, ...props }) { return React.createElement('div', props, children); }
export function RadioGroupItem({ value, ...props }) { return React.createElement('input', { type: 'radio', value, ...props }); }

// Sonner toast
export function Toaster(props) { return null; }
export function toast(message) { console.log('[Toast]', message); }

// Form
export function Form({ children, ...props }) { return React.createElement('form', props, children); }
export function FormField({ render, name, control, ...props }) { return render ? render({ field: { name, value: '', onChange: () => {}, onBlur: () => {} } }) : null; }
export function FormItem({ children, ...props }) { return React.createElement('div', { className: 'space-y-2', ...props }, children); }
export function FormLabel({ children, ...props }) { return React.createElement('label', props, children); }
export function FormControl({ children, ...props }) { return React.createElement('div', props, children); }
export function FormMessage({ ...props }) { return null; }

// DropdownMenu
export function DropdownMenu({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DropdownMenuTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function DropdownMenuContent({ children, ...props }) { return null; }
export function DropdownMenuItem({ children, ...props }) { return React.createElement('div', props, children); }

// Popover
export function Popover({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function PopoverTrigger({ children, asChild, ...props }) { return React.createElement(React.Fragment, null, children); }
export function PopoverContent({ children, ...props }) { return null; }

// Collapsible
export function Collapsible({ children, ...props }) { return React.createElement('div', props, children); }
export function CollapsibleTrigger({ children, ...props }) { return React.createElement('div', props, children); }
export function CollapsibleContent({ children, ...props }) { return React.createElement('div', props, children); }

// NavigationMenu
export function NavigationMenu({ children, className, ...props }) { return React.createElement('nav', { className, ...props }, children); }
export function NavigationMenuList({ children, ...props }) { return React.createElement('ul', props, children); }
export function NavigationMenuItem({ children, ...props }) { return React.createElement('li', props, children); }
export function NavigationMenuTrigger({ children, ...props }) { return React.createElement('button', props, children); }
export function NavigationMenuContent({ children, ...props }) { return React.createElement('div', props, children); }
export function NavigationMenuLink({ children, ...props }) { return React.createElement('a', props, children); }

// Breadcrumb
export function Breadcrumb({ children, ...props }) { return React.createElement('nav', props, children); }
export function BreadcrumbList({ children, ...props }) { return React.createElement('ol', { className: 'flex items-center gap-1.5', ...props }, children); }
export function BreadcrumbItem({ children, ...props }) { return React.createElement('li', props, children); }
export function BreadcrumbLink({ children, ...props }) { return React.createElement('a', props, children); }
export function BreadcrumbSeparator({ ...props }) { return React.createElement('span', props, '/'); }

// Table
export function Table({ children, className, ...props }) { return React.createElement('table', { className: cn('w-full caption-bottom text-sm', className), ...props }, children); }
export function TableHeader({ children, ...props }) { return React.createElement('thead', props, children); }
export function TableBody({ children, ...props }) { return React.createElement('tbody', props, children); }
export function TableRow({ children, className, ...props }) { return React.createElement('tr', { className: cn('border-b', className), ...props }, children); }
export function TableHead({ children, className, ...props }) { return React.createElement('th', { className: cn('h-12 px-4 text-left align-middle font-medium', className), ...props }, children); }
export function TableCell({ children, className, ...props }) { return React.createElement('td', { className: cn('p-4 align-middle', className), ...props }, children); }

// Carousel
export function Carousel({ children, className, ...props }) { return React.createElement('div', { className, ...props }, children); }
export function CarouselContent({ children, ...props }) { return React.createElement('div', { className: 'flex', ...props }, children); }
export function CarouselItem({ children, ...props }) { return React.createElement('div', { className: 'min-w-0 flex-shrink-0 flex-grow-0 basis-full', ...props }, children); }
export function CarouselPrevious({ ...props }) { return React.createElement('button', props, '<'); }
export function CarouselNext({ ...props }) { return React.createElement('button', props, '>'); }

// AspectRatio
export function AspectRatio({ children, ratio = 1, className, ...props }) { return React.createElement('div', { style: { position: 'relative', paddingBottom: (1 / ratio * 100) + '%' }, className, ...props }, React.createElement('div', { style: { position: 'absolute', inset: 0 } }, children)); }

// HoverCard
export function HoverCard({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function HoverCardTrigger({ children, ...props }) { return React.createElement(React.Fragment, null, children); }
export function HoverCardContent({ children, ...props }) { return null; }

// Command
export function Command({ children, className, ...props }) { return React.createElement('div', { className, ...props }, children); }
export function CommandInput({ ...props }) { return React.createElement('input', { type: 'text', ...props }); }
export function CommandList({ children, ...props }) { return React.createElement('div', props, children); }
export function CommandEmpty({ children, ...props }) { return React.createElement('div', props, children); }
export function CommandGroup({ children, ...props }) { return React.createElement('div', props, children); }
export function CommandItem({ children, ...props }) { return React.createElement('div', props, children); }

// Calendar
export function Calendar({ ...props }) { return React.createElement('div', { className: 'p-3 text-center text-sm text-muted-foreground' }, 'Calendar'); }

export default {};
`;

// ── Industry-contextual fallback images ──────────────────────────────────────
const CONTEXTUAL_IMAGES: Record<string, string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  ],
  salon: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
    'https://images.unsplash.com/photo-1521590832167-7228f0829e2e?w=800&q=80',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  ],
  medical: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80',
    'https://images.unsplash.com/photo-1666214280557-091e203c7096?w=800&q=80',
  ],
  saas: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
  ],
  ecommerce: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
  ],
  portfolio: [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80',
  ],
  contractor: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
  ],
  agency: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
  ],
  coaching: [
    'https://images.unsplash.com/photo-1552581234-26160f608093?w=800&q=80',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  ],
  'local-service': [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  ],
};

const PORTRAIT_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
];

/**
 * Replace broken/fake Unsplash URLs and empty image sources with real contextual images.
 * Catches patterns like photo-1234567890 (sequential digits = fake), empty src, and placeholder.com.
 */
function repairBrokenImageUrls(code: string): string {
  let imgIndex = 0;
  const fallbackImages = CONTEXTUAL_IMAGES.default;

  // Fix fake Unsplash URLs (sequential digits like photo-1234567890)
  code = code.replace(
    /https:\/\/images\.unsplash\.com\/photo-(\d{10,})\?[^"'\s)]+/g,
    (match, photoId) => {
      // Check if digits are sequential (fake) — e.g. 1234567890
      const isSequential = /^0?1234/.test(photoId) || /^(\d)\1+$/.test(photoId);
      if (isSequential) {
        const replacement = fallbackImages[imgIndex % fallbackImages.length];
        imgIndex++;
        return replacement;
      }
      return match;
    }
  );

  // Fix placeholder.com URLs
  code = code.replace(
    /https?:\/\/(?:via\.)?placeholder\.com\/[^"'\s)]+/g,
    () => {
      const replacement = fallbackImages[imgIndex % fallbackImages.length];
      imgIndex++;
      return replacement;
    }
  );

  // Fix empty src attributes
  code = code.replace(/src=["']\s*["']/g, () => {
    const replacement = fallbackImages[imgIndex % fallbackImages.length];
    imgIndex++;
    return `src="${replacement}"`;
  });

  // Fix avatar/portrait placeholder URLs (small images in testimonials)
  code = code.replace(
    /src=["'](https?:\/\/(?:randomuser|i\.pravatar|ui-avatars)[^"']*?)["']/g,
    () => {
      const replacement = PORTRAIT_IMAGES[imgIndex % PORTRAIT_IMAGES.length];
      imgIndex++;
      return `src="${replacement}"`;
    }
  );

  return code;
}

/**
 * Parse an HSL CSS variable value like "222.2 84% 4.9%" and return the lightness as a number.
 */
function extractLightness(hslValue: string): number | null {
  const match = hslValue.match(/[\d.]+\s+[\d.]+%\s+([\d.]+)%/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Enforce minimum contrast between background/foreground pairs in CSS custom properties.
 * If both bg and fg have similar lightness, fix the foreground to guarantee visibility.
 */
function enforceContrastInCSS(css: string): string {
  const pairs = [
    ['--background', '--foreground'],
    ['--card', '--card-foreground'],
    ['--primary', '--primary-foreground'],
    ['--secondary', '--secondary-foreground'],
    ['--muted', '--muted-foreground'],
    ['--accent', '--accent-foreground'],
    ['--popover', '--popover-foreground'],
    ['--destructive', '--destructive-foreground'],
  ];

  // Extract all CSS variable values
  const varValues: Record<string, string> = {};
  const varRegex = /(--[\w-]+)\s*:\s*([\d.]+\s+[\d.]+%\s+[\d.]+%)/g;
  let m;
  while ((m = varRegex.exec(css)) !== null) {
    varValues[m[1]] = m[2];
  }

  for (const [bgVar, fgVar] of pairs) {
    const bgVal = varValues[bgVar];
    const fgVal = varValues[fgVar];
    if (!bgVal || !fgVal) continue;

    const bgL = extractLightness(bgVal);
    const fgL = extractLightness(fgVal);
    if (bgL === null || fgL === null) continue;

    const contrast = Math.abs(bgL - fgL);
    if (contrast < 40) {
      // Insufficient contrast — fix the foreground
      const newFgL = bgL < 50 ? '98%' : '4.9%';
      const fgParts = fgVal.match(/([\d.]+)\s+([\d.]+%)\s+[\d.]+%/);
      if (fgParts) {
        const newFgVal = `${fgParts[1]} ${fgParts[2]} ${newFgL}`;
        css = css.replace(
          new RegExp(`(${fgVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)${fgVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
          `$1${newFgVal}`
        );
        console.warn(`[contrast-fix] ${fgVar}: ${fgVal} → ${newFgVal} (bg lightness: ${bgL}%)`);
      }
    }
  }

  return css;
}

/**
 * Detect if content is raw CSS (not valid JSX/TSX).
 * Returns true if the content looks like a stylesheet rather than a React component.
 */
function isRawCss(content: string): boolean {
  const trimmed = content.trim();
  // Must NOT have React indicators
  if (/\b(import\s+|export\s+(default\s+)?|function\s+\w+|const\s+\w+\s*=|class\s+\w+)/.test(trimmed)) {
    return false;
  }
  // Must have CSS indicators
  return /^(\s*(@import|@font-face|@media|@keyframes|@tailwind|:root|html|body|\*|\.[\w-]|#[\w-])\s*[{(])/m.test(trimmed);
}

function injectPreviewNavBridge(code: string, filePath: string): string {
  // Only inject into /index.tsx or /index.jsx (the canonical Sandpack entry)
  if (!/^\/index\.(?:tsx?|jsx?)$/.test(filePath)) return code;
  if (code.includes('__initLovablePreviewNavBridge')) return code;

  const bridges = `${PREVIEW_NAV_BRIDGE}\n__initLovablePreviewNavBridge();\n\n${PREVIEW_SELECTION_BRIDGE}\n__initLovablePreviewSelectionBridge();`;

  const importBlock = code.match(/^(?:import[^\n]*\n)+/);
  if (importBlock) {
    return `${importBlock[0]}\n${bridges}\n\n${code.slice(importBlock[0].length)}`;
  }

  return `${bridges}\n\n${code}`;
}

function getFileDirectory(filePath: string): string {
  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash <= 0 ? '/' : normalized.slice(0, lastSlash);
}

function toRelativeSandpackImport(fromFilePath: string, targetPath: string): string {
  const fromParts = getFileDirectory(fromFilePath).split('/').filter(Boolean);
  const targetParts = targetPath.replace(/^\//, '').split('/').filter(Boolean);

  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < targetParts.length &&
    fromParts[shared] === targetParts[shared]
  ) {
    shared += 1;
  }

  const upLevels = fromParts.length - shared;
  const downParts = targetParts.slice(shared);
  const relativeParts = [...Array(upLevels).fill('..'), ...downParts];
  const relativePath = relativeParts.join('/');

  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function aliasModuleToRelativeImport(fromFilePath: string, aliasModulePath: string): string {
  const normalizedModulePath = aliasModulePath.replace(/^@\//, '');
  return toRelativeSandpackImport(fromFilePath, `/${normalizedModulePath}`);
}

function resolveUiShimDefaultImportName(modulePath: string, localName?: string): string {
  const moduleBasename = modulePath
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/\.(tsx?|jsx?)$/, '') ?? '';

  const uiExportMap: Record<string, string> = {
    'accordion': 'Accordion',
    'aspect-ratio': 'AspectRatio',
    'avatar': 'Avatar',
    'badge': 'Badge',
    'breadcrumb': 'Breadcrumb',
    'button': 'Button',
    'calendar': 'Calendar',
    'card': 'Card',
    'carousel': 'Carousel',
    'checkbox': 'Checkbox',
    'collapsible': 'Collapsible',
    'command': 'Command',
    'dialog': 'Dialog',
    'dropdown-menu': 'DropdownMenu',
    'form': 'Form',
    'hover-card': 'HoverCard',
    'input': 'Input',
    'label': 'Label',
    'navigation-menu': 'NavigationMenu',
    'popover': 'Popover',
    'progress': 'Progress',
    'radio-group': 'RadioGroup',
    'scroll-area': 'ScrollArea',
    'select': 'Select',
    'separator': 'Separator',
    'sheet': 'Sheet',
    'skeleton': 'Skeleton',
    'switch': 'Switch',
    'table': 'Table',
    'tabs': 'Tabs',
    'textarea': 'Textarea',
    'tooltip': 'Tooltip',
  };

  if (uiExportMap[moduleBasename]) return uiExportMap[moduleBasename];
  if (localName && /^[A-Z]/.test(localName)) return localName;

  const inferredName = moduleBasename
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return inferredName || 'Button';
}

function formatNamedImport(exportName: string, localName?: string): string {
  if (!localName || exportName === localName) return exportName;
  return `${exportName} as ${localName}`;
}

/**
 * Wrap raw CSS content in a valid React component so Sandpack can render it.
 * Uses JSON.stringify to safely embed CSS as a string constant (avoids template literal parsing issues).
 */
function wrapCssInReactComponent(css: string): string {
  const cssJsonStr = JSON.stringify(css);
  return `import React from 'react';

const CSS_CONTENT = ${cssJsonStr};

export default function App() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_CONTENT }} />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Styles applied. Add HTML content to see the design.</p>
      </div>
    </>
  );
}
`;
}

function toPascalCaseIdentifier(filePath: string): string {
  const basename = filePath
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/\.(tsx|jsx|ts|js)$/, '') ?? 'App';

  return basename
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'App';
}

function findBestComponentExportName(content: string, filePath: string): string | null {
  if (/export\s+default\b/.test(content) || /export\s*\{[^}]*\bas\s+default\b[^}]*\}/.test(content)) {
    return null;
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (name: string) => {
    if (!/^[A-Z][A-Za-z0-9_]*$/.test(name) || seen.has(name)) return;
    seen.add(name);
    candidates.push(name);
  };

  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g)) {
    pushCandidate(match[1]);
  }
  for (const match of content.matchAll(/export\s+(?:const|let|var|class)\s+([A-Z][A-Za-z0-9_]*)/g)) {
    pushCandidate(match[1]);
  }
  for (const match of content.matchAll(/(?:const|let|var|function|class)\s+([A-Z][A-Za-z0-9_]*)/g)) {
    pushCandidate(match[1]);
  }

  for (const match of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    const specifiers = match[1].split(',');
    for (const specifier of specifiers) {
      const [localName] = specifier.trim().split(/\s+as\s+/i);
      if (localName) pushCandidate(localName.trim());
    }
  }

  const preferred = toPascalCaseIdentifier(filePath);
  if (seen.has(preferred)) return preferred;
  if (seen.has('App')) return 'App';
  return candidates[0] || null;
}

function ensureDefaultExportForReactModule(content: string, filePath: string): string {
  if (!/\.(tsx|jsx)$/.test(filePath)) return content;
  if (/export\s+default\b/.test(content) || /export\s*\{[^}]*\bas\s+default\b[^}]*\}/.test(content)) {
    return content;
  }

  const exportName = findBestComponentExportName(content, filePath);
  if (!exportName) return content;

  return `${content}\nexport default ${exportName};\n`;
}

function createProxyApp(targetPath: string): string {
  const importPath = toRelativeSandpackImport('/App.tsx', targetPath).replace(/\.(tsx?|jsx?)$/, '');

  return `import React from 'react';
import { HashRouter } from 'react-router-dom';
import * as PreviewEntryModule from '${importPath}';

// Robust component discovery: prefer default export, then find first PascalCase function/class component
function findRenderableComponent(mod) {
  if (mod.default && (typeof mod.default === 'function' || (typeof mod.default === 'object' && mod.default.$$typeof))) {
    return mod.default;
  }
  for (const [key, value] of Object.entries(mod)) {
    if (key === '__esModule' || key === 'default') continue;
    if (/^[A-Z]/.test(key) && (typeof value === 'function' || (typeof value === 'object' && value !== null && value.$$typeof))) {
      return value;
    }
  }
  return null;
}

const PreviewEntry = findRenderableComponent(PreviewEntryModule);

// Error boundary to catch render errors from PreviewEntry
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[Sandpack Preview] Component render error:', error);
    console.error('[Sandpack Preview] Error details:', errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', backgroundColor: '#f5f5f5' }
      }, React.createElement('div', {
        style: { textAlign: 'center', maxWidth: 600, padding: 32, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e5e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
      }, React.createElement('div', { style: { fontSize: 32, marginBottom: 12 } }, '⚠️'), React.createElement('h2', { style: { fontSize: 18, marginBottom: 8, color: '#d32f2f', fontWeight: 500 } }, 'Component Render Error'), React.createElement('p', { style: { color: '#888', fontSize: 14, marginBottom: 16, lineHeight: '1.5' } }, 'An error occurred while rendering the preview component. Check the browser console for details.'), React.createElement('div', { style: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, textAlign: 'left', fontSize: 12, color: '#666', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto', marginBottom: 12 } }, React.createElement('div', { style: { fontWeight: 'bold', color: '#333', marginBottom: 4 } }, 'Error:'), this.state.error?.toString(), this.state.errorInfo && React.createElement(React.Fragment, null, React.createElement('div', { style: { fontWeight: 'bold', color: '#333', marginTop: 12, marginBottom: 4 } }, 'Stack:'), this.state.errorInfo.componentStack)), React.createElement('div', { style: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 4, textAlign: 'left', fontSize: 11, color: '#666', border: '1px solid #eee' } }, React.createElement('div', { style: { fontWeight: 'bold', color: '#333', marginBottom: 6 } }, 'Debugging Tips:'), React.createElement('ul', { style: { margin: 0, paddingLeft: 20 } }, React.createElement('li', null, 'Check the browser console (F12) for detailed error messages'), React.createElement('li', null, 'Verify all imported components exist and export a valid React component'), React.createElement('li', null, "Ensure components use 'export default' or named PascalCase exports"), React.createElement('li', null, 'Source: ${targetPath}')))));
    }

    return this.props.children;
  }
}

export default function App() {
  if (!PreviewEntry) {
    return React.createElement('div', {
      style: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }
    }, React.createElement('div', {
      style: { textAlign: 'center', maxWidth: 420, padding: 32 }
    }, React.createElement('h2', { style: { fontSize: 18, marginBottom: 8 } }, 'No renderable component found'), React.createElement('p', { style: { color: '#888', fontSize: 14 } }, 'The entry file does not export a valid React component. Check that your component uses "export default" or a named PascalCase export.'), React.createElement('p', { style: { color: '#aaa', fontSize: 12, marginTop: 12 } }, 'Source: ${targetPath}')));
  }

  return React.createElement(
    HashRouter,
    null,
    React.createElement(ErrorBoundary, null, React.createElement(PreviewEntry))
  );
}
`;
}

function createMissingEntryApp(): string {
  return `import React from 'react';

export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Invalid Launcher preview payload</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The preview did not receive a renderable industry-theme React entry file from Launcher.
        </p>
      </div>
    </div>
  );
}
`;
}

// ── Real component generators keyed by section name ─────────────────────────
// When the AI generates App.tsx that imports ./components/Hero etc. but omits
// the actual file, we synthesize a REAL section component — not a stub.

interface GeneratorContext {
  industry: string;
  images: string[];
  portraits: string[];
  brandName: string;
}

/** Detect industry from existing VFS content (CSS vars, copy, file names). */
function detectIndustryFromVFS(files: Record<string, string>): string {
  const allContent = Object.values(files).join(' ').toLowerCase();
  const indicators: [string, string[]][] = [
    ['restaurant', ['menu', 'dish', 'cuisine', 'chef', 'reservation', 'dining', 'restaurant', 'bistro', 'cafe']],
    ['salon', ['salon', 'beauty', 'hair', 'spa', 'stylist', 'treatment', 'nail', 'skincare', 'facial']],
    ['fitness', ['fitness', 'gym', 'workout', 'training', 'exercise', 'crossfit', 'yoga', 'pilates', 'membership']],
    ['medical', ['medical', 'health', 'clinic', 'doctor', 'patient', 'dental', 'physician', 'hospital', 'healthcare']],
    ['coaching', ['coaching', 'coach', 'consulting', 'mentor', 'mindset', 'breakthrough', 'discovery call', 'mastermind', 'transformation']],
    ['local-service', ['plumbing', 'hvac', 'electrical', 'roofing', 'handyman', 'licensed', 'insured', 'estimate', 'emergency service']],
    ['saas', ['saas', 'software', 'platform', 'dashboard', 'analytics', 'api', 'startup', 'integration', 'deploy']],
    ['ecommerce', ['shop', 'product', 'cart', 'store', 'buy', 'ecommerce', 'collection', 'checkout', 'catalog']],
    ['portfolio', ['portfolio', 'creative', 'freelance', 'selected work', 'case study', 'skillset']],
    ['contractor', ['contractor', 'construction', 'remodel', 'renovation', 'home improvement', 'general contractor']],
    ['agency', ['agency', 'marketing', 'branding', 'campaign', 'strategy', 'digital agency', 'creative agency']],
  ];
  for (const [industry, keywords] of indicators) {
    if (keywords.filter(k => allContent.includes(k)).length >= 2) return industry;
  }
  return 'default';
}

/** Extract business name from App.tsx / VFS content. */
function extractBusinessName(files: Record<string, string>): string {
  for (const content of Object.values(files)) {
    const h1 = content.match(/<h1[^>]*>([^<]{2,40})<\/h1>/i);
    if (h1) return h1[1].trim();
    const title = content.match(/(?:brandName|businessName|siteName|company)\s*[=:]\s*["']([^"']+)["']/);
    if (title) return title[1];
  }
  return 'Our Business';
}

function genHero(ctx: GeneratorContext): string {
  return `import React from 'react';

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="${ctx.images[0] || CONTEXTUAL_IMAGES.default[0]}" alt="${ctx.brandName}" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">${ctx.brandName}</h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">Premium ${ctx.industry} services crafted with passion and expertise for our valued clients.</p>
        <div className="flex flex-wrap gap-4">
          <button className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all text-lg">Get Started</button>
          <button className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all text-lg">Learn More</button>
        </div>
      </div>
    </section>
  );
}

export default Hero;`;
}

function genNavbar(ctx: GeneratorContext): string {
  return `import React from 'react';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="text-xl font-bold text-foreground">${ctx.brandName}</a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-foreground/70 hover:text-foreground transition-colors">About</a>
          <a href="#services" className="text-foreground/70 hover:text-foreground transition-colors">Services</a>
          <a href="#contact" className="text-foreground/70 hover:text-foreground transition-colors">Contact</a>
          <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Book Now</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;`;
}

function genHeader(ctx: GeneratorContext): string {
  return `import React from 'react';

export function Header() {
  return (
    <header className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-foreground">${ctx.brandName}</span>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
          <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Services</a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;`;
}

function genFeatures(ctx: GeneratorContext): string {
  return `import React from 'react';

const features = [
  { title: 'Expert Team', desc: 'Our certified professionals bring years of ${ctx.industry} experience to every project.', icon: '⭐' },
  { title: 'Quality First', desc: 'We use only premium materials and cutting-edge techniques for outstanding results.', icon: '✨' },
  { title: 'Fast Turnaround', desc: 'Efficient processes ensure your project is completed on time, every time.', icon: '⚡' },
  { title: 'Customer Focus', desc: 'Your satisfaction drives everything we do — from consultation to completion.', icon: '💎' },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Why Choose Us</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Discover what sets us apart in the ${ctx.industry} industry</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <span className="text-4xl mb-4 block">{f.icon}</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;`;
}

function genServices(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  const img2 = ctx.images[2] || CONTEXTUAL_IMAGES.default[2];
  return `import React from 'react';

const services = [
  { name: 'Premium Service', desc: 'Our flagship ${ctx.industry} offering with personalized attention to detail.', price: 'From $99', img: '${img0}' },
  { name: 'Standard Package', desc: 'Everything you need to get started with professional quality.', price: 'From $59', img: '${img1}' },
  { name: 'Custom Solution', desc: 'Tailored specifically to your unique requirements and goals.', price: 'Contact Us', img: '${img2}' },
];

export function Services() {
  return (
    <section id="services" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Services</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Professional solutions tailored to your needs</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div key={i} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <div className="h-56 overflow-hidden">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{s.name}</h3>
                <p className="text-muted-foreground mb-4">{s.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold text-lg">{s.price}</span>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Learn More</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;`;
}

function genAbout(ctx: GeneratorContext): string {
  const img = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  return `import React from 'react';

export function About() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">About ${ctx.brandName}</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">With years of experience in the ${ctx.industry} industry, we have built a reputation for excellence, reliability, and genuine care for our clients.</p>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">Our team of dedicated professionals is passionate about delivering exceptional results that exceed expectations every time.</p>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center"><span className="block text-3xl font-bold text-primary">10+</span><span className="text-muted-foreground text-sm">Years</span></div>
              <div className="text-center"><span className="block text-3xl font-bold text-primary">500+</span><span className="text-muted-foreground text-sm">Clients</span></div>
              <div className="text-center"><span className="block text-3xl font-bold text-primary">50+</span><span className="text-muted-foreground text-sm">Team</span></div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img src="${img}" alt="About ${ctx.brandName}" className="w-full h-[500px] object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;`;
}

function genTestimonials(ctx: GeneratorContext): string {
  return `import React from 'react';

const testimonials = [
  { name: 'Sarah Johnson', role: 'Regular Client', text: 'Absolutely outstanding service! ${ctx.brandName} exceeded all my expectations.', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Michael Chen', role: 'Business Owner', text: 'Professional, reliable, and incredibly talented. They transformed my vision into reality.', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Emily Rodriguez', role: 'Returning Customer', text: 'The attention to detail and personalized approach makes all the difference.', img: '${PORTRAIT_IMAGES[2]}' },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">What Our Clients Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-1 mb-4">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-500 text-lg">★</span>)}</div>
              <p className="text-card-foreground mb-6 italic leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                <div><p className="font-semibold text-card-foreground">{t.name}</p><p className="text-muted-foreground text-sm">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;`;
}

function genContact(ctx: GeneratorContext): string {
  const emailDomain = ctx.brandName.toLowerCase().replace(/\s+/g, '');
  return `import React from 'react';

export function Contact() {
  return (
    <section id="contact" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-6">Get In Touch</h2>
            <p className="text-muted-foreground text-lg mb-8">Ready to get started? Reach out and we will respond within 24 hours.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground"><span className="text-primary text-xl">📍</span>123 Business Ave, Suite 100</div>
              <div className="flex items-center gap-3 text-foreground"><span className="text-primary text-xl">📞</span>(555) 123-4567</div>
              <div className="flex items-center gap-3 text-foreground"><span className="text-primary text-xl">✉️</span>hello@${emailDomain}.com</div>
            </div>
          </div>
          <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="First Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
              <input placeholder="Last Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            </div>
            <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
            <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Contact;`;
}

function genFooter(ctx: GeneratorContext): string {
  return `import React from 'react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-xl font-bold mb-4">${ctx.brandName}</h3>
            <p className="text-background/70 text-sm leading-relaxed">Delivering exceptional quality and service since day one.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-background/70 text-sm">
              <li><a href="#" className="hover:text-background transition-colors">Home</a></li>
              <li><a href="#services" className="hover:text-background transition-colors">Services</a></li>
              <li><a href="#about" className="hover:text-background transition-colors">About</a></li>
              <li><a href="#contact" className="hover:text-background transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-background/70 text-sm">
              <li>Mon-Fri: 9am - 6pm</li>
              <li>Saturday: 10am - 4pm</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-sm">X</a>
              <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-sm">in</a>
              <a href="#" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-sm">ig</a>
            </div>
          </div>
        </div>
        <div className="border-t border-background/20 pt-8 text-center text-background/50 text-sm">&copy; {new Date().getFullYear()} ${ctx.brandName}. All rights reserved.</div>
      </div>
    </footer>
  );
}

export default Footer;`;
}

function genPricing(_ctx: GeneratorContext): string {
  return `import React from 'react';

const plans = [
  { name: 'Basic', price: '$29', period: '/mo', features: ['Core features', 'Email support', '1 user', 'Basic analytics'], popular: false },
  { name: 'Professional', price: '$79', period: '/mo', features: ['Everything in Basic', 'Priority support', '5 users', 'Advanced analytics', 'Custom integrations'], popular: true },
  { name: 'Enterprise', price: '$199', period: '/mo', features: ['Everything in Pro', '24/7 support', 'Unlimited users', 'Custom solutions', 'Dedicated manager'], popular: false },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Simple Pricing</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Choose the plan that fits your needs</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <div key={i} className={\`bg-card border rounded-2xl p-8 relative \${p.popular ? 'border-primary shadow-xl scale-105' : 'border-border'}\`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{p.name}</h3>
              <div className="mb-6"><span className="text-4xl font-bold text-foreground">{p.price}</span><span className="text-muted-foreground">{p.period}</span></div>
              <ul className="space-y-3 mb-8">{p.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-muted-foreground"><span className="text-primary">✓</span>{f}</li>)}</ul>
              <button className={\`w-full py-3 rounded-lg font-semibold transition-opacity \${p.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:opacity-80'}\`}>Get Started</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pricing;`;
}

function genGallery(_ctx: GeneratorContext): string {
  return `import React from 'react';

const galleryImages = [
  '${CONTEXTUAL_IMAGES.default[0]}',
  '${CONTEXTUAL_IMAGES.default[1]}',
  '${CONTEXTUAL_IMAGES.default[2]}',
  '${CONTEXTUAL_IMAGES.portfolio[0]}',
  '${CONTEXTUAL_IMAGES.agency[0]}',
  '${CONTEXTUAL_IMAGES.saas[0]}',
];

export function Gallery() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Our Work</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((src, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden group cursor-pointer">
              <img src={src} alt={\`Gallery \${i+1}\`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Gallery;`;
}

function genCTA(ctx: GeneratorContext): string {
  return `import React from 'react';

export function CTA() {
  return (
    <section className="py-24 bg-primary">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-primary-foreground mb-6">Ready to Get Started?</h2>
        <p className="text-primary-foreground/80 text-xl mb-10 max-w-2xl mx-auto">Join hundreds of satisfied customers who chose ${ctx.brandName}.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="px-8 py-4 bg-background text-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg">Contact Us Today</button>
          <button className="px-8 py-4 border-2 border-primary-foreground text-primary-foreground font-semibold rounded-lg hover:bg-primary-foreground/10 transition-colors text-lg">View Our Work</button>
        </div>
      </div>
    </section>
  );
}

export default CTA;`;
}

function genFAQ(_ctx: GeneratorContext): string {
  return `import React from 'react';

const faqs = [
  { q: 'How do I get started?', a: 'Simply reach out through our contact form or give us a call. We will schedule a free consultation to discuss your needs.' },
  { q: 'What are your hours?', a: 'We are open Monday through Friday, 9am to 6pm, and Saturday 10am to 4pm.' },
  { q: 'Do you offer free consultations?', a: 'Yes! We offer a complimentary initial consultation to understand your requirements and provide a detailed quote.' },
  { q: 'What is your cancellation policy?', a: 'We require 24-hour notice for cancellations. Late cancellations may incur a fee.' },
];

export function FAQ() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <section className="py-24 bg-background">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-left text-foreground font-medium hover:bg-secondary/50 transition-colors">
                {f.q}<span className="text-muted-foreground ml-2">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div className="px-6 pb-4 text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;`;
}

function genTeam(_ctx: GeneratorContext): string {
  return `import React from 'react';

const members = [
  { name: 'Alex Thompson', role: 'Founder & CEO', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Maria Garcia', role: 'Creative Director', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'James Wilson', role: 'Lead Developer', img: '${PORTRAIT_IMAGES[2]}' },
  { name: 'Sophie Chen', role: 'Operations Manager', img: '${PORTRAIT_IMAGES[3]}' },
];

export function Team() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Meet Our Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {members.map((m, i) => (
            <div key={i} className="text-center group">
              <div className="w-40 h-40 mx-auto rounded-full overflow-hidden mb-4 ring-4 ring-border group-hover:ring-primary transition-all">
                <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">{m.name}</h3>
              <p className="text-muted-foreground text-sm">{m.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Team;`;
}

// ── Industry-specific generators ──────────────────────────────────────────────
// RESTAURANT
function genMenu(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.default[1];
  return `import React from 'react';
const menuItems = [
  { category: 'Starters', items: [
    { name: 'Bruschetta', desc: 'Toasted bread with fresh tomatoes, basil, and olive oil', price: '$12', img: '${img0}' },
    { name: 'Soup of the Day', desc: "Chef's daily selection served with artisan bread", price: '$10' },
    { name: 'Caesar Salad', desc: 'Crisp romaine with parmesan, croutons, and house dressing', price: '$14' },
  ]},
  { category: 'Main Courses', items: [
    { name: 'Grilled Salmon', desc: 'Atlantic salmon with seasonal vegetables and lemon butter', price: '$28', img: '${img1}' },
    { name: 'Filet Mignon', desc: '8oz prime cut with truffle mashed potatoes', price: '$42' },
    { name: 'Pasta Primavera', desc: 'Fresh pasta with garden vegetables in a light cream sauce', price: '$22' },
  ]},
];
export function Menu() {
  return (
    <section id="menu" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Menu</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Crafted with the finest seasonal ingredients</p>
        {menuItems.map((cat, ci) => (
          <div key={ci} className="mb-16 last:mb-0">
            <h3 className="text-2xl font-semibold text-primary mb-8 text-center">{cat.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.items.map((item, ii) => (
                <div key={ii} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  {item.img && <img src={item.img} alt={item.name} className="w-full h-48 object-cover" />}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold text-card-foreground">{item.name}</h4>
                      <span className="text-primary font-bold">{item.price}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
export default Menu;`;
}

function genReservation(ctx: GeneratorContext): string {
  return `import React from 'react';
export function Reservation() {
  return (
    <section id="reservation" className="py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Make a Reservation</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Book your table at ${ctx.brandName}</p>
        <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Full Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Phone Number" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="date" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground" />
            <input type="time" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground" />
            <select className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground">
              <option>2 Guests</option><option>3 Guests</option><option>4 Guests</option><option>5+ Guests</option>
            </select>
          </div>
          <textarea placeholder="Special Requests" rows={3} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Reserve Table</button>
        </form>
      </div>
    </section>
  );
}
export default Reservation;`;
}

function genSpecials(ctx: GeneratorContext): string {
  const img = ctx.images[0] || CONTEXTUAL_IMAGES.default[0];
  return `import React from 'react';
const specials = [
  { name: "Chef's Tasting Menu", desc: 'A curated five-course experience featuring seasonal highlights.', price: '$85/person', img: '${img}' },
  { name: 'Weekend Brunch', desc: 'Enjoy our signature brunch menu every Saturday and Sunday.', price: 'From $18' },
  { name: 'Happy Hour', desc: 'Half-price appetizers and cocktails, Mon-Fri 4-6 PM.', price: 'From $6' },
];
export function Specials() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Today's Specials</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Hand-picked selections from our kitchen</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specials.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              {s.img && <img src={s.img} alt={s.name} className="w-full h-48 object-cover" />}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{s.name}</h3>
                <p className="text-muted-foreground mb-3">{s.desc}</p>
                <span className="text-primary font-bold">{s.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Specials;`;
}

// SALON / BEAUTY
function genTreatments(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.salon[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.salon[1];
  return `import React from 'react';
const treatments = [
  { name: 'Signature Facial', desc: 'Deep-cleansing facial customized to your skin type with premium products.', duration: '60 min', price: '$95', img: '${img0}' },
  { name: 'Hair Transformation', desc: 'Full color and cut with our senior stylist for a complete new look.', duration: '120 min', price: '$180', img: '${img1}' },
  { name: 'Relaxation Massage', desc: 'Full-body Swedish massage to melt away tension and restore balance.', duration: '90 min', price: '$120' },
  { name: 'Manicure & Pedicure', desc: 'Luxurious hand and foot treatment with gel polish application.', duration: '75 min', price: '$65' },
];
export function Treatments() {
  return (
    <section id="treatments" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Treatments</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Indulge in our curated wellness experiences</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {treatments.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition-shadow">
              {t.img && <img src={t.img} alt={t.name} className="w-full md:w-48 h-48 md:h-auto object-cover" />}
              <div className="p-6 flex-1">
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{t.name}</h3>
                <p className="text-muted-foreground text-sm mb-3">{t.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t.duration}</span>
                  <span className="text-primary font-bold text-lg">{t.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Treatments;`;
}

function genBeforeAfter(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.salon[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.salon[1];
  return `import React from 'react';
const transformations = [
  { title: 'Color Transformation', before: '${img0}', after: '${img1}', desc: 'From brunette to sun-kissed balayage' },
  { title: 'Skin Rejuvenation', before: '${img1}', after: '${img0}', desc: 'Visible results after our signature facial series' },
];
export function BeforeAfter() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Transformations</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">See the results our clients love</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {transformations.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="relative"><img src={t.before} alt="Before" className="w-full h-64 object-cover" /><span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Before</span></div>
                <div className="relative"><img src={t.after} alt="After" className="w-full h-64 object-cover" /><span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">After</span></div>
              </div>
              <div className="p-5"><h3 className="font-semibold text-card-foreground">{t.title}</h3><p className="text-muted-foreground text-sm mt-1">{t.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default BeforeAfter;`;
}

function genStylists(ctx: GeneratorContext): string {
  return `import React from 'react';
const stylists = [
  { name: 'Isabella Cruz', role: 'Senior Stylist', specialty: 'Color & Balayage', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Marcus Lee', role: 'Lead Barber', specialty: 'Precision Cuts', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Ava Williams', role: 'Esthetician', specialty: 'Facials & Skin Care', img: '${PORTRAIT_IMAGES[3]}' },
];
export function Stylists() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Meet Our Stylists</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stylists.map((s, i) => (
            <div key={i} className="text-center group">
              <div className="w-48 h-48 mx-auto rounded-full overflow-hidden mb-4 ring-4 ring-border group-hover:ring-primary transition-all">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-semibold text-foreground text-lg">{s.name}</h3>
              <p className="text-primary text-sm font-medium">{s.role}</p>
              <p className="text-muted-foreground text-sm mt-1">{s.specialty}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Stylists;`;
}

// FITNESS / GYM
function genClasses(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.fitness[0];
  return `import React from 'react';
const classes = [
  { name: 'HIIT Burn', time: 'Mon/Wed/Fri 6:00 AM', trainer: 'Coach Mike', level: 'All Levels', img: '${img0}' },
  { name: 'Power Yoga', time: 'Tue/Thu 7:30 AM', trainer: 'Sara K.', level: 'Beginner' },
  { name: 'Spin Cycle', time: 'Mon-Fri 12:00 PM', trainer: 'DJ Marcus', level: 'Intermediate' },
  { name: 'Strength Lab', time: 'Mon/Wed/Fri 5:30 PM', trainer: 'Coach Jake', level: 'Advanced' },
];
export function Classes() {
  return (
    <section id="classes" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Class Schedule</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Find the perfect class for your fitness journey</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((c, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 flex gap-4 items-center hover:shadow-lg transition-shadow">
              {c.img && <img src={c.img} alt={c.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-card-foreground">{c.name}</h3>
                <p className="text-muted-foreground text-sm">{c.time} &middot; {c.trainer}</p>
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{c.level}</span>
              </div>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0">Join</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Classes;`;
}

function genTrainers(ctx: GeneratorContext): string {
  return `import React from 'react';
const trainers = [
  { name: 'Mike Johnson', specialty: 'HIIT & Strength', cert: 'NASM-CPT', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Sara Kim', specialty: 'Yoga & Mobility', cert: 'RYT-500', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Jake Torres', specialty: 'Powerlifting', cert: 'CSCS', img: '${PORTRAIT_IMAGES[2]}' },
];
export function Trainers() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Expert Trainers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {trainers.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <img src={t.img} alt={t.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-card-foreground">{t.name}</h3>
              <p className="text-primary font-medium text-sm">{t.specialty}</p>
              <p className="text-muted-foreground text-xs mt-1">{t.cert}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Trainers;`;
}

function genMembership(_ctx: GeneratorContext): string {
  return `import React from 'react';
const plans = [
  { name: 'Day Pass', price: '$15', period: '/day', features: ['Full gym access', 'Locker room', 'Free WiFi'], popular: false },
  { name: 'Monthly', price: '$49', period: '/mo', features: ['Unlimited gym access', 'All group classes', 'Locker room', 'Free parking'], popular: true },
  { name: 'Annual', price: '$399', period: '/yr', features: ['Everything in Monthly', 'Personal training session', 'Nutrition consult', 'Guest passes'], popular: false },
];
export function Membership() {
  return (
    <section id="membership" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Membership Plans</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Flexible options to fit your lifestyle</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <div key={i} className={\`bg-card border rounded-2xl p-8 relative \${p.popular ? 'border-primary shadow-xl scale-105' : 'border-border'}\`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Best Value</span>}
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{p.name}</h3>
              <div className="mb-6"><span className="text-4xl font-bold text-foreground">{p.price}</span><span className="text-muted-foreground">{p.period}</span></div>
              <ul className="space-y-3 mb-8">{p.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-muted-foreground"><span className="text-primary">✓</span>{f}</li>)}</ul>
              <button className={\`w-full py-3 rounded-lg font-semibold transition-opacity \${p.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:opacity-80'}\`}>Join Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Membership;`;
}

function genSchedule(ctx: GeneratorContext): string { return genClasses(ctx); }
function genPrograms(ctx: GeneratorContext): string { return genClasses(ctx); }

// MEDICAL / HEALTH
function genDoctors(_ctx: GeneratorContext): string {
  return `import React from 'react';
const doctors = [
  { name: 'Dr. Sarah Chen', specialty: 'Family Medicine', education: 'Johns Hopkins University', img: '${PORTRAIT_IMAGES[1]}' },
  { name: 'Dr. James Wilson', specialty: 'Internal Medicine', education: 'Stanford Medical School', img: '${PORTRAIT_IMAGES[0]}' },
  { name: 'Dr. Emily Park', specialty: 'Pediatrics', education: 'Harvard Medical School', img: '${PORTRAIT_IMAGES[3]}' },
];
export function Doctors() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Our Physicians</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Board-certified professionals dedicated to your health</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {doctors.map((d, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <img src={d.img} alt={d.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-4 ring-4 ring-primary/20" />
              <h3 className="text-xl font-semibold text-card-foreground">{d.name}</h3>
              <p className="text-primary font-medium text-sm">{d.specialty}</p>
              <p className="text-muted-foreground text-xs mt-1">{d.education}</p>
              <button className="mt-4 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Book Appointment</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Doctors;`;
}

function genDepartments(ctx: GeneratorContext): string {
  const img = ctx.images[0] || CONTEXTUAL_IMAGES.medical[0];
  return `import React from 'react';
const departments = [
  { name: 'Primary Care', desc: 'Comprehensive health services for the whole family.', icon: '🏥' },
  { name: 'Pediatrics', desc: 'Specialized care for infants, children, and adolescents.', icon: '👶' },
  { name: 'Cardiology', desc: 'Expert heart health monitoring and treatment.', icon: '❤️' },
  { name: 'Orthopedics', desc: 'Bone, joint, and muscle care from diagnosis to recovery.', icon: '🦴' },
  { name: 'Dermatology', desc: 'Skin health diagnostics and cosmetic procedures.', icon: '✨' },
  { name: 'Urgent Care', desc: 'Walk-in care for non-life-threatening emergencies.', icon: '⚡' },
];
export function Departments() {
  return (
    <section id="departments" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Departments</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Comprehensive medical care under one roof</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((d, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <span className="text-3xl mb-3 block">{d.icon}</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{d.name}</h3>
              <p className="text-muted-foreground text-sm">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Departments;`;
}

function genAppointment(ctx: GeneratorContext): string {
  return `import React from 'react';
export function Appointment() {
  return (
    <section id="appointment" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Schedule an Appointment</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Your health is our priority at ${ctx.brandName}</p>
        <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Patient Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Phone" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="date" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground" />
            <select className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground">
              <option>Select Department</option><option>Primary Care</option><option>Pediatrics</option><option>Cardiology</option><option>Dermatology</option>
            </select>
          </div>
          <textarea placeholder="Reason for visit" rows={3} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Request Appointment</button>
        </form>
      </div>
    </section>
  );
}
export default Appointment;`;
}

function genInsurance(_ctx: GeneratorContext): string {
  return `import React from 'react';
const providers = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'United Healthcare', 'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid'];
export function Insurance() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Insurance Accepted</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto text-lg">We work with most major insurance providers</p>
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {providers.map((p, i) => (
            <span key={i} className="bg-card border border-border rounded-xl px-6 py-3 text-card-foreground font-medium text-sm">{p}</span>
          ))}
        </div>
        <p className="text-center text-muted-foreground text-sm mt-8">Don't see your provider? Contact us — we may still be able to help.</p>
      </div>
    </section>
  );
}
export default Insurance;`;
}

// SAAS / SOFTWARE
function genDemo(ctx: GeneratorContext): string {
  const img = ctx.images[0] || CONTEXTUAL_IMAGES.saas[0];
  return `import React from 'react';
export function Demo() {
  return (
    <section id="demo" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">Product Demo</span>
            <h2 className="text-4xl font-bold text-foreground mt-2 mb-6">See ${ctx.brandName} in Action</h2>
            <p className="text-muted-foreground text-lg mb-8">Watch how our platform streamlines your workflow and delivers results from day one.</p>
            <form className="space-y-4 max-w-sm" onSubmit={e => e.preventDefault()}>
              <input placeholder="Work email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Request Demo</button>
            </form>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
            <img src="${img}" alt="Product Demo" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
export default Demo;`;
}

function genIntegrations(_ctx: GeneratorContext): string {
  return `import React from 'react';
const integrations = [
  { name: 'Slack', desc: 'Real-time notifications and team collaboration.', icon: '💬' },
  { name: 'GitHub', desc: 'Sync repositories and track deployments.', icon: '🐙' },
  { name: 'Google Workspace', desc: 'Connect docs, sheets, and calendar.', icon: '📊' },
  { name: 'Stripe', desc: 'Seamless payment processing and invoicing.', icon: '💳' },
  { name: 'Zapier', desc: 'Automate workflows with 5000+ apps.', icon: '⚡' },
  { name: 'HubSpot', desc: 'CRM sync for sales and marketing.', icon: '🎯' },
];
export function Integrations() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Integrations</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Connects with the tools you already use</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {integrations.map((int, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <span className="text-3xl mb-3 block">{int.icon}</span>
              <h3 className="font-semibold text-card-foreground">{int.name}</h3>
              <p className="text-muted-foreground text-xs mt-1">{int.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Integrations;`;
}

function genDashboard(ctx: GeneratorContext): string {
  const img = ctx.images[1] || CONTEXTUAL_IMAGES.saas[1];
  return `import React from 'react';
export function Dashboard() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Dashboard</h2>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-lg">Everything you need at a glance — analytics, insights, and controls.</p>
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-border max-w-5xl mx-auto">
          <img src="${img}" alt="Dashboard Preview" className="w-full h-auto" />
        </div>
      </div>
    </section>
  );
}
export default Dashboard;`;
}

// E-COMMERCE
function genProducts(ctx: GeneratorContext): string {
  const img0 = ctx.images[0] || CONTEXTUAL_IMAGES.ecommerce[0];
  const img1 = ctx.images[1] || CONTEXTUAL_IMAGES.ecommerce[1];
  const img2 = ctx.images[2] || CONTEXTUAL_IMAGES.ecommerce[2];
  return `import React from 'react';
const products = [
  { name: 'Premium Collection', price: '$129', badge: 'New', img: '${img0}', rating: 4.8 },
  { name: 'Classic Edition', price: '$89', badge: 'Popular', img: '${img1}', rating: 4.9 },
  { name: 'Limited Release', price: '$199', badge: 'Limited', img: '${img2}', rating: 5.0 },
];
export function Products() {
  return (
    <section id="products" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Featured Products</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Handpicked favorites our customers love</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative h-72 overflow-hidden">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">{p.badge}</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-1">{p.name}</h3>
                <div className="flex items-center gap-1 mb-3">{'★'.repeat(Math.floor(p.rating)).split('').map((s, j) => <span key={j} className="text-yellow-500 text-sm">{s}</span>)}<span className="text-muted-foreground text-xs ml-1">{p.rating}</span></div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{p.price}</span>
                  <button className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Products;`;
}

function genCategories(ctx: GeneratorContext): string {
  const imgs = ctx.images.length >= 3 ? ctx.images : CONTEXTUAL_IMAGES.ecommerce;
  return `import React from 'react';
const categories = [
  { name: 'New Arrivals', count: 24, img: '${imgs[0]}' },
  { name: 'Best Sellers', count: 18, img: '${imgs[1]}' },
  { name: 'On Sale', count: 12, img: '${imgs[2] || imgs[0]}' },
];
export function Categories() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Shop by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((c, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden group cursor-pointer h-80">
              <img src={c.img} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold text-white">{c.name}</h3>
                <p className="text-white/80 text-sm">{c.count} products</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Categories;`;
}

// PORTFOLIO / CREATIVE
function genPortfolioProjects(ctx: GeneratorContext): string {
  const imgs = ctx.images.length >= 2 ? ctx.images : CONTEXTUAL_IMAGES.portfolio;
  return `import React from 'react';
const projects = [
  { title: 'Brand Identity Redesign', category: 'Branding', img: '${imgs[0]}' },
  { title: 'E-Commerce Platform', category: 'Web Development', img: '${imgs[1]}' },
  { title: 'Mobile App UI/UX', category: 'Design', img: '${imgs[2] || imgs[0]}' },
];
export function PortfolioProjects() {
  return (
    <section id="work" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Selected Work</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">A curated selection of recent projects</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projects.map((p, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="rounded-2xl overflow-hidden mb-4 aspect-[4/3]">
                <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <span className="text-primary text-sm font-medium">{p.category}</span>
              <h3 className="text-xl font-semibold text-foreground mt-1">{p.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default PortfolioProjects;`;
}

function genSkills(_ctx: GeneratorContext): string {
  return `import React from 'react';
const skills = [
  { name: 'UI/UX Design', level: 95 }, { name: 'React / TypeScript', level: 90 },
  { name: 'Brand Strategy', level: 85 }, { name: 'Motion Design', level: 80 },
];
export function Skills() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Skills & Expertise</h2>
        <div className="space-y-6">
          {skills.map((s, i) => (
            <div key={i}>
              <div className="flex justify-between mb-2"><span className="text-foreground font-medium">{s.name}</span><span className="text-muted-foreground text-sm">{s.level}%</span></div>
              <div className="w-full bg-secondary rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all" style={{ width: s.level + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Skills;`;
}

// CONTRACTOR / LOCAL SERVICE
function genEstimate(ctx: GeneratorContext): string {
  return `import React from 'react';
export function Estimate() {
  return (
    <section id="estimate" className="py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Get a Free Estimate</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Tell us about your project and we will get back within 24 hours</p>
        <form className="bg-card border border-border rounded-2xl p-8 space-y-5" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Your Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Phone" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <select className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground">
              <option>Select Service</option><option>Plumbing</option><option>Electrical</option><option>HVAC</option><option>Remodeling</option><option>Roofing</option>
            </select>
          </div>
          <textarea placeholder="Project details" rows={4} className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground resize-none" />
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Request Free Estimate</button>
        </form>
      </div>
    </section>
  );
}
export default Estimate;`;
}

function genServiceArea(_ctx: GeneratorContext): string {
  return `import React from 'react';
const areas = ['Downtown', 'Midtown', 'Westside', 'Eastside', 'North County', 'South Bay', 'Suburbs', 'Metro Area'];
export function ServiceArea() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Service Areas</h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto text-lg">Licensed and insured — proudly serving the greater metro area</p>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {areas.map((a, i) => (
            <span key={i} className="bg-card border border-border rounded-xl px-6 py-3 text-card-foreground font-medium text-sm hover:border-primary transition-colors cursor-default">{a}</span>
          ))}
        </div>
        <p className="text-center mt-8"><button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Check Your Area</button></p>
      </div>
    </section>
  );
}
export default ServiceArea;`;
}

function genLicenses(_ctx: GeneratorContext): string {
  return `import React from 'react';
const credentials = [
  { label: 'Licensed', icon: '📜', desc: 'Fully licensed in all service areas' },
  { label: 'Insured', icon: '🛡️', desc: '$2M liability coverage' },
  { label: 'Bonded', icon: '🔒', desc: 'Performance bond guaranteed' },
  { label: 'BBB A+', icon: '⭐', desc: 'Better Business Bureau rated' },
];
export function Licenses() {
  return (
    <section className="py-16 bg-primary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {credentials.map((c, i) => (
            <div key={i} className="text-center">
              <span className="text-3xl mb-2 block">{c.icon}</span>
              <h3 className="text-primary-foreground font-bold text-lg">{c.label}</h3>
              <p className="text-primary-foreground/70 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Licenses;`;
}

// AGENCY
function genCaseStudies(ctx: GeneratorContext): string {
  const imgs = ctx.images.length >= 2 ? ctx.images : CONTEXTUAL_IMAGES.agency;
  return `import React from 'react';
const studies = [
  { title: 'SaaS Platform Launch', result: '+340% signups in 90 days', category: 'Growth Marketing', img: '${imgs[0]}' },
  { title: 'E-Commerce Rebrand', result: '+120% conversion rate', category: 'Brand Strategy', img: '${imgs[1]}' },
  { title: 'Mobile App Campaign', result: '2M+ downloads in Q1', category: 'Digital Ads', img: '${imgs[2] || imgs[0]}' },
];
export function CaseStudies() {
  return (
    <section id="work" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Case Studies</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Real results for real businesses</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {studies.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-xl transition-all cursor-pointer">
              <div className="h-56 overflow-hidden"><img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
              <div className="p-6">
                <span className="text-primary text-sm font-medium">{s.category}</span>
                <h3 className="text-xl font-semibold text-card-foreground mt-1 mb-2">{s.title}</h3>
                <p className="text-muted-foreground font-medium">{s.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default CaseStudies;`;
}

function genProcess(_ctx: GeneratorContext): string {
  return `import React from 'react';
const steps = [
  { num: '01', title: 'Discovery', desc: 'Deep-dive into your brand, market, and goals.' },
  { num: '02', title: 'Strategy', desc: 'Data-driven plan tailored to your growth targets.' },
  { num: '03', title: 'Execution', desc: 'Multi-channel campaigns launched with precision.' },
  { num: '04', title: 'Optimize', desc: 'Continuous testing, learning, and scaling.' },
];
export function Process() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-16">Our Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">{s.num}</span>
              <h3 className="text-xl font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Process;`;
}

function genClients(_ctx: GeneratorContext): string {
  return `import React from 'react';
const clients = ['TechCorp', 'GrowthLab', 'NovaBrand', 'Skyline Digital', 'Apex Solutions', 'Vertex Inc.'];
export function Clients() {
  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-muted-foreground text-sm uppercase tracking-wider mb-8">Trusted by Leading Brands</p>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          {clients.map((c, i) => (
            <span key={i} className="text-xl font-bold text-muted-foreground/40 hover:text-foreground transition-colors cursor-default">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Clients;`;
}

// COACHING / CONSULTING
function genMethodology(_ctx: GeneratorContext): string {
  return `import React from 'react';
const pillars = [
  { title: 'Assess', desc: 'Comprehensive evaluation of your current position and goals.', icon: '🔍' },
  { title: 'Plan', desc: 'Custom roadmap designed around your unique challenges.', icon: '📋' },
  { title: 'Execute', desc: 'Guided implementation with accountability checkpoints.', icon: '🚀' },
  { title: 'Sustain', desc: 'Systems and habits for lasting transformation.', icon: '🏆' },
];
export function Methodology() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">The Framework</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">A proven methodology for breakthrough results</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {pillars.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <span className="text-4xl mb-4 block">{p.icon}</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">{p.title}</h3>
              <p className="text-muted-foreground text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Methodology;`;
}

function genResults(_ctx: GeneratorContext): string {
  return `import React from 'react';
const results = [
  { metric: '95%', label: 'Client Satisfaction' },
  { metric: '3x', label: 'Average ROI' },
  { metric: '500+', label: 'Clients Coached' },
  { metric: '12+', label: 'Years Experience' },
];
export function Results() {
  return (
    <section className="py-24 bg-primary">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-primary-foreground text-center mb-16">Proven Results</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {results.map((r, i) => (
            <div key={i} className="text-center">
              <span className="block text-5xl font-bold text-primary-foreground mb-2">{r.metric}</span>
              <span className="text-primary-foreground/70">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Results;`;
}

function genDiscoveryCall(ctx: GeneratorContext): string {
  return `import React from 'react';
export function DiscoveryCall() {
  return (
    <section id="book" className="py-24 bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Book a Free Discovery Call</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">Let's explore how ${ctx.brandName} can help you achieve your goals. No pressure, no obligation.</p>
          <form className="max-w-md mx-auto space-y-4" onSubmit={e => e.preventDefault()}>
            <input placeholder="Your Name" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <input placeholder="What's your biggest challenge?" className="w-full px-4 py-3 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground" />
            <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">Schedule Call</button>
          </form>
        </div>
      </div>
    </section>
  );
}
export default DiscoveryCall;`;
}

function genCoachingPrograms(_ctx: GeneratorContext): string {
  return `import React from 'react';
const programs = [
  { name: '1:1 Coaching', desc: 'Personalized sessions tailored to your goals.', duration: '12 weeks', price: 'From $2,500', popular: false },
  { name: 'Group Mastermind', desc: 'Collaborate with like-minded achievers.', duration: '8 weeks', price: 'From $997', popular: true },
  { name: 'VIP Intensive', desc: 'Accelerated breakthroughs in a focused 2-day deep-dive.', duration: '2 days', price: 'From $5,000', popular: false },
];
export function CoachingPrograms() {
  return (
    <section id="programs" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-foreground text-center mb-4">Programs</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto text-lg">Choose the path that fits your ambition</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {programs.map((p, i) => (
            <div key={i} className={\`bg-card border rounded-2xl p-8 relative \${p.popular ? 'border-primary shadow-xl scale-105' : 'border-border'}\`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="text-xl font-semibold text-card-foreground mb-2">{p.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{p.desc}</p>
              <p className="text-muted-foreground text-sm mb-1">{p.duration}</p>
              <p className="text-2xl font-bold text-foreground mb-6">{p.price}</p>
              <button className={\`w-full py-3 rounded-lg font-semibold transition-opacity \${p.popular ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-secondary-foreground hover:opacity-80'}\`}>Apply Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default CoachingPrograms;`;
}

// ── Stats section (universal) ─────────────────────────────────────────────────
function genStats(_ctx: GeneratorContext): string {
  return `import React from 'react';
const stats = [
  { value: '10+', label: 'Years Experience' },
  { value: '500+', label: 'Happy Clients' },
  { value: '50+', label: 'Team Members' },
  { value: '99%', label: 'Satisfaction Rate' },
];
export function Stats() {
  return (
    <section className="py-16 bg-primary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <span className="block text-4xl font-bold text-primary-foreground mb-1">{s.value}</span>
              <span className="text-primary-foreground/70 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default Stats;`;
}

// ── Booking (universal appointment form) ──────────────────────────────────────
function genBooking(ctx: GeneratorContext): string { return genReservation(ctx); }

// ── SECTION_GENERATORS registry ──────────────────────────────────────────────
const SECTION_GENERATORS: Record<string, (ctx: GeneratorContext) => string> = {
  // Universal
  hero: genHero, navbar: genNavbar, header: genHeader, features: genFeatures,
  services: genServices, about: genAbout, testimonials: genTestimonials,
  contact: genContact, footer: genFooter, pricing: genPricing,
  gallery: genGallery, cta: genCTA, faq: genFAQ, team: genTeam, stats: genStats,
  // Restaurant
  menu: genMenu, reservation: genReservation, specials: genSpecials,
  // Salon / Beauty
  treatments: genTreatments, beforeafter: genBeforeAfter, stylists: genStylists,
  // Fitness
  classes: genClasses, trainers: genTrainers, membership: genMembership, schedule: genSchedule, programs: genPrograms,
  // Medical
  doctors: genDoctors, departments: genDepartments, appointment: genAppointment, insurance: genInsurance,
  // SaaS
  demo: genDemo, integrations: genIntegrations, dashboard: genDashboard,
  // E-commerce
  products: genProducts, categories: genCategories,
  // Portfolio
  portfolioprojects: genPortfolioProjects, skills: genSkills,
  // Contractor / Local Service
  estimate: genEstimate, servicearea: genServiceArea, licenses: genLicenses,
  // Agency
  casestudies: genCaseStudies, process: genProcess, clients: genClients,
  // Coaching
  methodology: genMethodology, results: genResults, discoverycall: genDiscoveryCall,
  coachingprograms: genCoachingPrograms,
  // Aliases that map directly
  booking: genBooking,
};

/**
 * Levenshtein distance — measures how many edits needed to transform one string into another.
 * Used for fuzzy matching component names to known section generators.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Find the closest matching section generator key using fuzzy matching.
 * Returns null if distance is too high (no reasonable match).
 */
function findClosestSectionKey(componentName: string): string | null {
  const lower = componentName.toLowerCase();
  const registryKeys = Object.keys(SECTION_GENERATORS);
  const matches = registryKeys.map(key => ({
    key,
    distance: levenshteinDistance(lower, key),
  })).sort((a, b) => a.distance - b.distance);
  
  // If closest match has reasonable distance (≤3 chars or <50% of length), use it
  const closest = matches[0];
  if (closest.distance <= 3 || closest.distance < lower.length / 2) {
    return closest.key;
  }
  return null;
}

/** Normalize component name to a section generator key. */
function matchSectionGenerator(componentName: string): string | null {
  const lower = componentName.toLowerCase().replace(/section$|component$|block$|widget$/i, '');
  if (SECTION_GENERATORS[lower]) return lower;
  const aliases: Record<string, string> = {
    // Universal
    navigation: 'navbar', nav: 'navbar', topbar: 'navbar', menubar: 'navbar',
    herosection: 'hero', herobanner: 'hero', banner: 'hero', jumbotron: 'hero',
    featurelist: 'features', featuregrid: 'features', benefits: 'features', whyus: 'features', whychooseus: 'features', highlights: 'features',
    servicelist: 'services', servicegrid: 'services', offerings: 'services', whatwedo: 'services',
    aboutus: 'about', aboutsection: 'about', story: 'about', ourstory: 'about',
    testimonial: 'testimonials', reviews: 'testimonials', clientreviews: 'testimonials', socialproof: 'testimonials', customerreviews: 'testimonials',
    contactform: 'contact', contactus: 'contact', getintouch: 'contact', reachout: 'contact',
    footersection: 'footer', sitefooter: 'footer',
    pricingplan: 'pricing', pricingtable: 'pricing', plans: 'pricing', pricingcards: 'pricing',
    portfolio: 'gallery', showcase: 'gallery', work: 'gallery', ourwork: 'gallery',
    calltoaction: 'cta', ctasection: 'cta', ctablock: 'cta', ctabanner: 'cta',
    faqsection: 'faq', questions: 'faq', frequentlyasked: 'faq',
    teamgrid: 'team', ourteam: 'team', staff: 'team', people: 'team', meettheteam: 'team',
    statistics: 'stats', metrics: 'stats', numbers: 'stats', counters: 'stats', achievements: 'stats',

    // Restaurant
    menusection: 'menu', menulist: 'menu', foodmenu: 'menu', diningmenu: 'menu', menucard: 'menu', menugrid: 'menu',
    reservations: 'reservation', reservationform: 'reservation', booktable: 'reservation', tablereservation: 'reservation',
    dailyspecials: 'specials', todaysspecials: 'specials', specialoffers: 'specials', featuredmenu: 'specials', chefsspecial: 'specials',

    // Salon / Beauty
    treatmentlist: 'treatments', treatmentmenu: 'treatments', salonservices: 'treatments', beautyservices: 'treatments', spaservices: 'treatments', servicemenu: 'treatments',
    transformations: 'beforeafter', beforeandafter: 'beforeafter', results: 'results',
    ourstylists: 'stylists', hairstylists: 'stylists', beauticians: 'stylists', therapists: 'stylists',

    // Fitness
    classschedule: 'classes', classgrid: 'classes', groupclasses: 'classes', fitnessclasstable: 'classes', workouts: 'classes',
    ourtrainers: 'trainers', coaches: 'trainers', instructors: 'trainers', fitnessteam: 'trainers',
    membershipplans: 'membership', gympricing: 'membership', fitnesspricing: 'membership', joinplans: 'membership',
    timetable: 'schedule', weeklyschedule: 'schedule',
    fitnessprograms: 'programs', trainingprograms: 'programs',

    // Medical
    ourdoctors: 'doctors', physicians: 'doctors', medicalteam: 'doctors', providers: 'doctors', specialists: 'doctors',
    specialties: 'departments', medicaldepartments: 'departments', clinics: 'departments',
    bookappointment: 'appointment', schedulevisit: 'appointment', appointmentform: 'appointment',
    insuranceproviders: 'insurance', acceptedinsurance: 'insurance', insurancelist: 'insurance',

    // SaaS
    requestdemo: 'demo', bookdemo: 'demo', livedemo: 'demo', productdemo: 'demo', tryforfree: 'demo',
    integrationgrid: 'integrations', connectors: 'integrations', partners: 'integrations', ecosystem: 'integrations',
    productscreen: 'dashboard', apppreview: 'dashboard', screenshot: 'dashboard', platformpreview: 'dashboard',

    // E-commerce
    featuredproducts: 'products', productgrid: 'products', productcards: 'products', shopcollection: 'products', collection: 'products',
    shopcategories: 'categories', productcategories: 'categories', browsecategories: 'categories',

    // Portfolio
    selectedwork: 'portfolioprojects', projectgrid: 'portfolioprojects', creativework: 'portfolioprojects', projectshowcase: 'portfolioprojects',
    projects: 'portfolioprojects', mywork: 'portfolioprojects',
    skillset: 'skills', expertise: 'skills', capabilities: 'skills', techstack: 'skills',

    // Contractor / Local Service
    freeestimate: 'estimate', requestquote: 'estimate', getquote: 'estimate', quoterequest: 'estimate', estimateform: 'estimate',
    serviceareas: 'servicearea', coveragearea: 'servicearea', locationscovered: 'servicearea', areas: 'servicearea',
    credentials: 'licenses', certifications: 'licenses', trustbadges: 'licenses', accreditations: 'licenses',

    // Agency
    casestudy: 'casestudies', portfoliocases: 'casestudies', clientwork: 'casestudies', successstories: 'casestudies',
    ourprocess: 'process', howwework: 'process', workflow: 'process', approach: 'process', steps: 'process',
    ourclients: 'clients', trustedby: 'clients', clientlogos: 'clients', brandlogos: 'clients', partnerslogos: 'clients',

    // Coaching / Consulting
    framework: 'methodology', ourapproach: 'methodology', pillars: 'methodology', system: 'methodology',
    clientresults: 'results', outcomes: 'results', impact: 'results', successmetrics: 'results',
    bookacall: 'discoverycall', freeconsult: 'discoverycall', strategycall: 'discoverycall', consultation: 'discoverycall', calendly: 'discoverycall',
    coachingplans: 'coachingprograms', programplans: 'coachingprograms', packages: 'coachingprograms',

    // Booking (universal)
    bookingform: 'booking', bookingwidget: 'booking', schedulebooking: 'booking',
  };
  if (aliases[lower]) return aliases[lower];
  
  // Try substring / partial matches
  for (const key of Object.keys(SECTION_GENERATORS)) {
    if (lower.includes(key) || key.includes(lower)) return key;
  }
  
  // Last resort: fuzzy matching - find the closest match
  const fuzzyMatch = findClosestSectionKey(componentName);
  if (fuzzyMatch) {
    console.warn(`[matchSectionGenerator] Fuzzy match: "${componentName}" → "${fuzzyMatch}"`);
    return fuzzyMatch;
  }
  
  return null;
}

// ── Built-in HTML/React elements that should NOT be treated as custom components ──
const BUILTIN_JSX_ELEMENTS = new Set([
  'React', 'Fragment', 'Suspense', 'StrictMode',
  // Common variable names that look PascalCase but aren't components
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Map', 'Set', 'Promise',
  'Error', 'JSON', 'Math', 'RegExp', 'Symbol', 'Proxy', 'Reflect',
  // Component from error boundary / React internals
  'Component', 'PureComponent',
]);

/**
 * Remove unused imports from a source file.
 * Detects named imports that are never referenced in the rest of the file body.
 */
function removeUnusedImports(source: string): string {
  if (!source) return source;

  // Split into lines for import detection
  return source.replace(
    /^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm,
    (fullMatch, namedGroup: string) => {
      const names = namedGroup.split(',').map((n: string) => n.trim()).filter(Boolean);
      // Resolve alias: "Foo as Bar" → check usage of "Bar"
      const usedNames = names.filter((n: string) => {
        const alias = n.includes(' as ') ? n.split(' as ')[1].trim() : n.trim();
        // Check if alias appears in the rest of the source (outside import statements)
        const bodyWithoutImports = source.replace(/^import\s+.*$/gm, '');
        // Must appear as identifier (word boundary), not just substring
        const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`);
        return regex.test(bodyWithoutImports);
      });

      if (usedNames.length === 0) return ''; // Remove entire import
      if (usedNames.length === names.length) return fullMatch; // All used

      // Reconstruct with only used names
      return fullMatch.replace(`{${namedGroup}}`, `{ ${usedNames.join(', ')} }`);
    }
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scan JSX in all files for PascalCase component usage (e.g. `<Gallery />`)
 * that has NO corresponding import statement. For each missing component,
 * inject a relative import pointing to `./components/ComponentName`.
 * This ensures `generateMissingComponents` (which only scans import statements)
 * will then synthesize the actual component file.
 */
function autoInjectMissingJsxImports(sandpackFiles: Record<string, string>): void {
  const existingPaths = new Set(Object.keys(sandpackFiles));

  for (const [filePath, content] of Object.entries({ ...sandpackFiles })) {
    if (!/\.(tsx|jsx)$/.test(filePath)) continue;

    // Extract all PascalCase component names used in JSX: <ComponentName or <ComponentName>
    const jsxUsages = new Set<string>();
    const jsxPattern = /<([A-Z][A-Za-z0-9]+)[\s/>]/g;
    let m;
    while ((m = jsxPattern.exec(content)) !== null) {
      const name = m[1];
      if (!BUILTIN_JSX_ELEMENTS.has(name)) {
        jsxUsages.add(name);
      }
    }

    if (jsxUsages.size === 0) continue;

    // Find all currently imported names in this file
    const importedNames = new Set<string>();
    const importNamePattern = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/g;
    let im;
    while ((im = importNamePattern.exec(content)) !== null) {
      if (im[1]) importedNames.add(im[1]);
      if (im[2]) {
        im[2].split(',').forEach(n => {
          const cleaned = n.trim().split(/\s+as\s+/).pop()?.trim();
          if (cleaned) importedNames.add(cleaned);
        });
      }
    }

    // Also check for local function/const/class declarations
    const localDeclPattern = /(?:function|const|class|let|var)\s+([A-Z]\w*)/g;
    let ld;
    while ((ld = localDeclPattern.exec(content)) !== null) {
      importedNames.add(ld[1]);
    }

    // Find missing components
    const missing: string[] = [];
    for (const name of jsxUsages) {
      if (importedNames.has(name)) continue;
      missing.push(name);
    }

    if (missing.length === 0) continue;

    // Inject import statements for missing components
    const imports = missing.map(name => {
      // Check if the component file already exists somewhere in the VFS
      const possiblePaths = [
        `/components/${name}.tsx`, `/${name}.tsx`,
        `/components/${name}.jsx`, `/${name}.jsx`,
        `/pages/${name}.tsx`, `/pages/${name}.jsx`,
      ];
      const existing = possiblePaths.find(p => existingPaths.has(p));
      const importPath = existing
        ? toRelativeSandpackImport(filePath, existing.replace(/\.(tsx|jsx)$/, ''))
        : `./components/${name}`;
      return `import ${name} from '${importPath}';`;
    }).join('\n');

    // Insert imports after the last existing import line
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }

    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, imports);
    } else {
      // No imports at all — prepend
      lines.unshift(imports);
    }

    sandpackFiles[filePath] = lines.join('\n');
    console.log(`[sandpackFilePrep] Auto-injected imports for ${missing.join(', ')} in ${filePath}`);
  }
}

function resolveRelativeModuleTarget(
  filePath: string,
  rawImportPath: string,
  existingPaths: Set<string>,
): string | null {
  const extensions = ['.tsx', '.jsx', '.ts', '.js'];
  const dir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
  let resolved = rawImportPath.startsWith('/')
    ? rawImportPath
    : `${dir}/${rawImportPath}`.replace(/\/\.\//g, '/');

  const parts = resolved.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '..') stack.pop();
    else if (part !== '.' && part !== '') stack.push(part);
  }

  resolved = '/' + stack.join('/');
  const candidates = /\.\w+$/.test(resolved)
    ? [resolved]
    : [resolved, ...extensions.map((ext) => `${resolved}${ext}`)];

  return candidates.find((candidate) => existingPaths.has(candidate)) || null;
}

function inspectModuleExports(content: string): {
  hasDefault: boolean;
  named: Set<string>;
  primaryName: string | null;
} {
  const named = new Set<string>();
  const exportPatterns = [
    /export\s+function\s+([A-Z]\w*)/g,
    /export\s+const\s+([A-Z]\w*)/g,
    /export\s+class\s+([A-Z]\w*)/g,
  ];

  for (const pattern of exportPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      named.add(match[1]);
    }
  }

  const reExportPattern = /export\s*\{([^}]+)\}/g;
  let reExportMatch: RegExpExecArray | null;
  while ((reExportMatch = reExportPattern.exec(content)) !== null) {
    reExportMatch[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const [sourceName, aliasName] = part.split(/\s+as\s+/).map((item) => item.trim());
        const exportName = aliasName || sourceName;
        if (/^[A-Z]/.test(exportName)) {
          named.add(exportName);
        }
      });
  }

  const hasDefault = /export\s+default\b/.test(content);
  const primaryName =
    content.match(/export\s+default\s+function\s+([A-Z]\w*)/)?.[1] ||
    content.match(/export\s+default\s+class\s+([A-Z]\w*)/)?.[1] ||
    content.match(/export\s+default\s+([A-Z]\w*)\s*;?/)?.[1] ||
    [...named][0] ||
    null;

  return { hasDefault, named, primaryName };
}

function repairLocalImportContracts(sandpackFiles: Record<string, string>): void {
  const existingPaths = new Set(Object.keys(sandpackFiles));

  for (const [filePath, originalContent] of Object.entries({ ...sandpackFiles })) {
    if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;

    const namedImportRegex = /^import\s+\{([^}]+)\}\s+from\s+['"](\.\.?\/[^'"]+)['"];?\s*$/gm;
    let content = originalContent;

    content = content.replace(namedImportRegex, (statement, specifierBlock: string, rawImportPath: string) => {
      const targetPath = resolveRelativeModuleTarget(filePath, rawImportPath, existingPaths);
      if (!targetPath) return statement;

      const targetContent = sandpackFiles[targetPath];
      if (!targetContent) return statement;

      const moduleExports = inspectModuleExports(targetContent);
      const specifiers = specifierBlock
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [imported, local] = part.split(/\s+as\s+/).map((value) => value.trim());
          return { imported, local: local || imported };
        });

      const missingPascalExports = specifiers.filter(
        ({ imported }) => /^[A-Z]/.test(imported) && !moduleExports.named.has(imported),
      );

      if (missingPascalExports.length === 0) return statement;

      if (moduleExports.primaryName) {
        let patchedTarget = targetContent;
        let changed = false;

        for (const { imported } of missingPascalExports) {
          if (patchedTarget.includes(`export const ${imported} = ${moduleExports.primaryName};`)) continue;
          patchedTarget += `\nexport const ${imported} = ${moduleExports.primaryName};\n`;
          changed = true;
        }

        if (changed) {
          sandpackFiles[targetPath] = patchedTarget;
          console.warn(`[sandpackFilePrep] Repaired named exports for ${targetPath}: ${missingPascalExports.map((item) => item.imported).join(', ')}`);
        }

        return statement;
      }

      if (moduleExports.hasDefault && specifiers.length === 1) {
        const localName = specifiers[0].local;
        console.warn(`[sandpackFilePrep] Rewriting named import to default import in ${filePath}: ${specifiers[0].imported} -> ${localName}`);
        return `import ${localName} from '${rawImportPath}';`;
      }

      return statement;
    });

    if (content !== originalContent) {
      sandpackFiles[filePath] = content;
    }
  }
}

/**
 * Scan all files for relative imports. For missing modules, generate REAL
 * contextual section components using the wizard launcher context
 * inferred from existing VFS content (industry, brand name, images).
 * 
 * CRITICAL: NEVER GENERATES STUBS. ALL missing components are injected with
 * real industry-appropriate UI/template chips from the detection context.
 */
function generateIndustryContextualComponent(componentName: string, ctx: GeneratorContext): string {
  const lower = componentName.toLowerCase();
  
  // Industry-specific toolkit — canonical list of real chips for each industry
  const industryTookits: Record<string, string[]> = {
    restaurant: ['menu', 'reservation', 'specials', 'features', 'contact', 'footer', 'testimonials', 'about', 'navbar', 'cta'],
    salon: ['treatments', 'beforeafter', 'stylists', 'services', 'features', 'contact', 'footer', 'testimonials', 'about', 'gallery'],
    fitness: ['classes', 'trainers', 'membership', 'programs', 'schedule', 'features', 'contact', 'footer', 'testimonials', 'about'],
    medical: ['doctors', 'departments', 'appointment', 'insurance', 'services', 'features', 'contact', 'footer', 'testimonials', 'about'],
    ecommerce: ['products', 'categories', 'features', 'services', 'contact', 'footer', 'testimonials', 'about', 'pricing', 'gallery'],
    saas: ['demo', 'integrations', 'dashboard', 'features', 'pricing', 'contact', 'footer', 'testimonials', 'about', 'faq'],
    portfolio: ['portfolioprojects', 'skills', 'about', 'contact', 'footer', 'testimonials', 'services', 'features'],
    coaching: ['methodology', 'results', 'discoverycall', 'coachingprograms', 'testimonials', 'about', 'contact', 'footer', 'pricing'],
    'local-service': ['estimate', 'servicearea', 'licenses', 'features', 'about', 'contact', 'footer', 'testimonials', 'services'],
    agency: ['casestudies', 'process', 'clients', 'services', 'features', 'about', 'contact', 'footer', 'testimonials', 'portfolio'],
    default: ['hero', 'features', 'services', 'about', 'contact', 'testimonials', 'cta', 'footer', 'pricing', 'gallery'],
  };
  
  // Common pattern-to-section mappings (applies across all industries)
  const commonPatterns: Record<string, string[]> = {
    'card': ['features', 'services', 'testimonials'],
    'item': ['features', 'services'],
    'grid': ['gallery', 'products'],
    'list': ['features', 'services'],
    'chip': ['features', 'services', 'testimonials'],
    'tile': ['features', 'gallery'],
    'block': ['features', 'services', 'about'],
    'widget': ['features', 'contact'],
    'section': ['features', 'services', 'about'],
    'component': ['features', 'services'],
    'panel': ['features', 'pricing'],
    'modal': ['contact', 'booking'],
  };
  
  // 1. Try exact section key match first
  if (SECTION_GENERATORS[lower]) {
    console.log(`[chip-inject] Direct match: "${componentName}" → ${lower}`);
    return SECTION_GENERATORS[lower](ctx);
  }
  
  // 2. Try explicit pattern match (card → features/services, item → features, etc.)
  for (const [pattern, sections] of Object.entries(commonPatterns)) {
    if (lower.includes(pattern)) {
      // Use hash to select consistently from the pattern options
      const hashValue = componentName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const idx = Math.abs(hashValue) % sections.length;
      const section = sections[idx];
      if (SECTION_GENERATORS[section]) {
        console.log(`[chip-inject] Pattern match: "${componentName}" (pattern: "${pattern}") → ${section}`);
        return SECTION_GENERATORS[section](ctx);
      }
    }
  }
  
  // 3. Try fuzzy match against the industry's toolkit
  const toolkit = industryTookits[ctx.industry] || industryTookits.default;
  const fuzzyMatches = toolkit
    .filter(key => SECTION_GENERATORS[key])
    .map(key => ({
      key,
      distance: levenshteinDistance(lower, key),
    }))
    .filter(m => m.distance <= 4)
    .sort((a, b) => a.distance - b.distance);
  
  if (fuzzyMatches.length > 0) {
    const match = fuzzyMatches[0].key;
    console.log(`[chip-inject] Fuzzy match: "${componentName}" → ${match} (distance: ${fuzzyMatches[0].distance}, industry: ${ctx.industry})`);
    return SECTION_GENERATORS[match](ctx);
  }
  
  // 4. Use deterministic variant from industry toolkit based on component name hash
  const industryDefaults = toolkit.filter(k => SECTION_GENERATORS[k]);
  if (industryDefaults.length > 0) {
    const hashIdx = Math.abs(componentName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % industryDefaults.length;
    const selectedKey = industryDefaults[hashIdx];
    console.log(`[chip-inject] Hash-based selection: "${componentName}" → ${selectedKey} (industry: ${ctx.industry})`);
    return SECTION_GENERATORS[selectedKey](ctx);
  }
  
  // 5. Absolute fallback: use universal components that work in any industry
  const universalOptions = ['hero', 'features', 'services', 'about', 'contact', 'testimonials', 'cta', 'footer'];
  const universalIdx = Math.abs(componentName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % universalOptions.length;
  const fallbackKey = universalOptions[universalIdx];
  
  console.warn(`[chip-inject] FINAL FALLBACK (no industry match): "${componentName}" → ${fallbackKey} (universal)`);
  if (SECTION_GENERATORS[fallbackKey]) {
    return SECTION_GENERATORS[fallbackKey](ctx);
  }
  
  // Defensive: if somehow fallback fails, use hero (always exists)
  console.error(`[chip-inject] CRITICAL FALLBACK: "${componentName}" → hero (all else failed)`);
  return SECTION_GENERATORS['hero'](ctx);
}

/**
 * Scan all files for relative imports. For missing modules, generate REAL
 * contextual section components using the wizard launcher context
 * inferred from existing VFS content (industry, brand name, images).
 * 
 * CRITICAL: NEVER GENERATES STUBS. ALL missing components are injected with
 * real industry-appropriate UI/template chips from the detection context.
 */

/**
 * Scan all files for relative imports. For missing modules, generate REAL
 * contextual section components using the wizard launcher context
 * inferred from existing VFS content (industry, brand name, images).
 */
function generateMissingComponents(sandpackFiles: Record<string, string>): void {
  const existingPaths = new Set(Object.keys(sandpackFiles));
  const extensions = ['.tsx', '.jsx', '.ts', '.js'];

  const industry = detectIndustryFromVFS(sandpackFiles);
  const images = CONTEXTUAL_IMAGES[industry] || CONTEXTUAL_IMAGES.default;
  const brandName = extractBusinessName(sandpackFiles);
  const ctx: GeneratorContext = { industry, images, portraits: PORTRAIT_IMAGES, brandName };

  for (const [filePath, content] of Object.entries({ ...sandpackFiles })) {
    if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;

    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"](\.\.?\/[^'"]+)['"]/g;
    let im;
    while ((im = importRegex.exec(content)) !== null) {
      const rawImportPath = im[1];
      const dir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
      let resolved = rawImportPath.startsWith('/')
        ? rawImportPath
        : `${dir}/${rawImportPath}`.replace(/\/\.\//g, '/');

      const parts = resolved.split('/');
      const stack: string[] = [];
      for (const p of parts) {
        if (p === '..') stack.pop();
        else if (p !== '.' && p !== '') stack.push(p);
      }
      resolved = '/' + stack.join('/');

      if (/\.(css|scss|less)$/.test(resolved)) continue;

      const candidates = [resolved, ...extensions.map(ext => resolved + ext)];
      if (candidates.some(c => existingPaths.has(c))) continue;

      const targetPath = /\.\w+$/.test(resolved) ? resolved : `${resolved}.tsx`;
      if (existingPaths.has(targetPath)) continue;

      const importStatement = im[0];
      const defaultMatch = importStatement.match(/import\s+([A-Z]\w*)\s/);
      const namedMatch = importStatement.match(/import\s+\{([^}]+)\}/);
      const componentName = defaultMatch?.[1] || namedMatch?.[1]?.split(',')[0]?.trim()?.split(/\s+as\s+/)?.[0] || resolved.split('/').pop() || '';

      const sectionKey = matchSectionGenerator(componentName);

      if (sectionKey) {
        let generated = SECTION_GENERATORS[sectionKey](ctx);
        // Generators now produce both `export function X` and `export default X`.
        // If the import uses a DIFFERENT name than the generator's function name,
        // add an alias export so `import { CustomName }` resolves.
        if (namedMatch) {
          const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          for (const name of names) {
            if (/^[A-Z]/.test(name) && !generated.includes(`export function ${name}`) && !generated.includes(`export const ${name}`)) {
              // Find the generator's primary function name
              const fnMatch = generated.match(/export function (\w+)/);
              if (fnMatch) {
                generated += `\nexport const ${name} = ${fnMatch[1]};\n`;
              }
            }
          }
        }
        sandpackFiles[targetPath] = generated;
        console.log(`[sandpackFilePrep] Generated real ${sectionKey} component: ${targetPath}`);
      } else {
        // NO STUBS ALLOWED. Generate real industry-appropriate component.
        const industryCode = generateIndustryContextualComponent(componentName, ctx);
        
        // Handle named imports that use different names than the generated export
        let finalCode = industryCode;
        if (namedMatch) {
          const names = namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
          for (const name of names) {
            if (/^[A-Z]/.test(name) && !finalCode.includes(`export function ${name}`) && !finalCode.includes(`export const ${name}`)) {
              // Find the generator's primary function name and create an alias
              const fnMatch = finalCode.match(/export function (\w+)/);
              if (fnMatch) {
                finalCode += `\nexport const ${name} = ${fnMatch[1]};\n`;
              }
            }
          }
        }
        
        sandpackFiles[targetPath] = finalCode;
        console.log(`[chip-inject COMPLETE] Generated real component: ${targetPath} (name: "${componentName}")`);
      }

      existingPaths.add(targetPath);
    }
  }
}

function pickPrimaryComponentPath(paths: string[]): string | null {
  const uniquePaths = [...new Set(paths)].filter((path) => path !== '/hooks-shim.ts');

  return uniquePaths.find((path) => path === '/App.tsx' || path === '/App.jsx')
    || uniquePaths.find((path) => /\/pages\/(Home|Index)[^/]*\.(tsx|jsx)$/i.test(path))
    || uniquePaths.find((path) => /\/pages\//.test(path))
    || uniquePaths.find((path) => !/\/(index)\.(tsx|jsx)$/.test(path))
    || uniquePaths[0]
    || null;
}

function repairMalformedDefaultExportClosures(content: string): string {
  return content.replace(
    /export\s+default\s+([A-Z]\w*)\s*;\s*\}/g,
    '}\n\nexport default $1;'
  );
}

function hasReactValueImport(content: string): boolean {
  return (
    /^\s*import\s+(?:React\b(?:\s*,[\s\S]*?)?|\*\s+as\s+React\b)\s+from\s+['"]react['"]/m.test(content) ||
    /^\s*import\s+\{[\s\S]*\bdefault\s+as\s+React\b[\s\S]*\}\s+from\s+['"]react['"]/m.test(content)
  );
}

function forceClassicReactJsxRuntime(content: string): string {
  if (!content) return content;

  let patched = content;
  const hasJsxSyntax = /<([A-Za-z][\w.:~-]*)[\s/>]|<>|<\/>|<\/([A-Za-z][\w.:~-]*)>/.test(patched);
  const hasCompiledJsxRuntimeImport = /from\s+['"]react\/jsx(?:-dev)?-runtime['"]/.test(patched);
  const alreadyHasReactValueImport = hasReactValueImport(patched);

  if (hasCompiledJsxRuntimeImport) {
    patched = patched.replace(
      /^\s*import\s+\{?\s*jsx(?:DEV| as \w+)?\s*,?\s*jsxs?(?: as \w+)?\s*,?\s*Fragment(?: as \w+)?\s*\}?\s+from\s+['"]react\/jsx-runtime['"];?\s*$/gm,
      ''
    );
    patched = patched.replace(
      /^\s*import\s+\{?\s*jsxDEV(?: as \w+)?\s*,?\s*Fragment(?: as \w+)?\s*\}?\s+from\s+['"]react\/jsx-dev-runtime['"];?\s*$/gm,
      ''
    );
    patched = patched.replace(/\b_jsxDEV\(/g, 'React.createElement(');
    patched = patched.replace(/\bjsxDEV\(/g, 'React.createElement(');
    patched = patched.replace(/\b_jsxs\(/g, 'React.createElement(');
    patched = patched.replace(/\bjsxs\(/g, 'React.createElement(');
    patched = patched.replace(/\b_jsx\(/g, 'React.createElement(');
    patched = patched.replace(/\bjsx\(/g, 'React.createElement(');
    patched = patched.replace(/\bFragment\b/g, 'React.Fragment');

    if (!alreadyHasReactValueImport) {
      patched = `import * as React from 'react';\n${patched.replace(/^\n+/, '')}`;
    }

    return patched.replace(/\n{3,}/g, '\n\n');
  }

  if (!hasJsxSyntax) {
    return patched.replace(/\n{3,}/g, '\n\n');
  }

  patched = patched.replace(/^\s*\/\*\*?\s*@jsxRuntime\s+[^\n*]+\*\/\s*\n?/gm, '');
  patched = patched.replace(/^\s*\/\*\*?\s*@jsxImportSource\s+[^\n*]+\*\/\s*\n?/gm, '');
  patched = patched.replace(/^\s*\/\*\*?\s*@jsx\s+[^\n*]+\*\/\s*\n?/gm, '');
  patched = patched.replace(/^\s*\/\*\*?\s*@jsxFrag\s+[^\n*]+\*\/\s*\n?/gm, '');

  const pragmaBlock = [
    '/** @jsxRuntime classic */',
    '/** @jsx React.createElement */',
    '/** @jsxFrag React.Fragment */',
  ].join('\n');

  patched = `${pragmaBlock}\n${patched.replace(/^\n+/, '')}`;

  if (!alreadyHasReactValueImport) {
    patched = patched.replace(
      pragmaBlock,
      `${pragmaBlock}\nimport * as React from 'react';`
    );
  }

  return patched.replace(/\n{3,}/g, '\n\n');
}

/**
 * Process code to strip/transform imports that Sandpack can't resolve.
 * Also fixes dangerouslySetInnerHTML template literals that contain CSS (which crash Babel).
 */
export function processCode(code: string, filePath: string): string {
  if (!/\.(tsx?|jsx?|mjs)$/.test(filePath)) {
    return code;
  }

  // ── Safe lucide-react imports ──────────────────────────────────────────
  // Transform all `import { Icon } from 'lucide-react'` into safe namespace
  // lookups with fallback aliases for commonly-missing social-media icons.
  // Handles multiple import statements without duplicate declarations.
  const __LUCIDE_ALIAS_MAP: Record<string, string> = {
    // Canonical brand icon spellings → exact lucide-react export names
    facebook: 'Facebook',
    facebookicon: 'FacebookIcon',
    FacebookLogo: 'Facebook',
    twitter: 'Twitter',
    twittericon: 'TwitterIcon',
    TwitterLogo: 'Twitter',
    XTwitter: 'Twitter',
    TwitterX: 'Twitter',
    instagram: 'Instagram',
    instagramicon: 'InstagramIcon',
    InstagramLogo: 'Instagram',
    github: 'Github',
    githubicon: 'GithubIcon',
    GitHub: 'Github',
    GitHubIcon: 'GithubIcon',
    GithubLogo: 'Github',
    linkedin: 'Linkedin',
    linkedinicon: 'LinkedinIcon',
    LinkedIn: 'Linkedin',
    LinkedInIcon: 'LinkedinIcon',
    LinkedinLogo: 'Linkedin',
    youtube: 'Youtube',
    youtubeicon: 'YoutubeIcon',
    YouTube: 'Youtube',
    YouTubeIcon: 'YoutubeIcon',
    YoutubeLogo: 'Youtube',
    // Social media icons missing from lucide-react → best visual alternative
    TikTok: 'Music', Tiktok: 'Music',
    Pinterest: 'Pin', Pintrest: 'Pin',
    Snapchat: 'Camera', SnapChat: 'Camera',
    WhatsApp: 'MessageCircle', Whatsapp: 'MessageCircle',
    Telegram: 'Send',
    Discord: 'MessageSquare',
    Reddit: 'MessageCircle',
    Threads: 'AtSign',
    Signal: 'Radio',
    WeChat: 'MessageCircle', Wechat: 'MessageCircle',
    Spotify: 'Music',
    SoundCloud: 'CloudRain', Soundcloud: 'CloudRain',
    Vimeo: 'Video',
    Behance: 'Palette',
    Medium: 'BookOpen',
    Mastodon: 'Globe',
    // Common AI hallucinations
    ShieldCheck: 'Shield',
    BadgeCheck: 'Award',
    UserCheck: 'UserCheck',
  };

  let __lucideImportDone = false;
  const __allLucideIcons: Array<{ original: string; alias: string }> = [];
  const __seenLucideAliases = new Set<string>();

  const getLucideLookupCandidates = (original: string): string[] => {
    const trimmed = original.trim();
    const normalized = trimmed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const pascalized = normalized
      ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
      : trimmed;

    return Array.from(new Set([
      trimmed,
      __LUCIDE_ALIAS_MAP[trimmed],
      __LUCIDE_ALIAS_MAP[normalized],
      pascalized,
    ].filter((value): value is string => Boolean(value))));
  };

  // Collect all lucide-react imports
  const lucideImportRe = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g;
  let lucideMatch: RegExpExecArray | null;
  while ((lucideMatch = lucideImportRe.exec(code)) !== null) {
    // Collapse all whitespace (including newlines) before splitting
    const rawNames = lucideMatch[1].replace(/\s+/g, ' ');
    const names = rawNames.split(',')
      .map(n => n.trim())
      .filter(Boolean)
      .map(n => {
        const parts = n.split(/\s+as\s+/);
        const orig = parts[0].replace(/\s+/g, '');
        const al = (parts[1] || parts[0]).replace(/\s+/g, '');
        return { original: orig, alias: al };
      });
    for (const name of names) {
      if (__seenLucideAliases.has(name.alias)) continue;
      __seenLucideAliases.add(name.alias);
      __allLucideIcons.push(name);
    }
  }

  if (__allLucideIcons.length > 0) {
    code = code.replace(lucideImportRe, (_match) => {
      if (__lucideImportDone) return '/* lucide import merged above */';
      __lucideImportDone = true;

      const lines: string[] = [
        `import * as __LucideIcons from 'lucide-react';`,
        `const __LucideFallback = (props) => React.createElement('svg', Object.assign({ viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, props), React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 12 }), React.createElement('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }));`,
      ];
      for (const { original, alias } of __allLucideIcons) {
        const candidates = getLucideLookupCandidates(original);
        const lookup = `${candidates.map((name) => `__LucideIcons['${name}']`).join(' || ')} || __LucideFallback`;
        lines.push(`const ${alias} = ${lookup};`);
      }
      return lines.join('\n');
    });
  }

  // ── Fix: hoist __LucideFallback & deduplicate namespace import ────────
  // The AI sometimes generates a file that already has the namespace import
  // + hand-written `const X = __LucideIcons['X'] || __LucideFallback;` lines
  // (without the fallback defined), then a remaining named import gets processed
  // and the replacement inserts __LucideFallback *below* those existing lookups,
  // causing a TDZ ReferenceError.  Remove duplicate namespace imports and ensure
  // the fallback declaration always sits right after the first namespace import.
  {
    const nsLine = `import * as __LucideIcons from 'lucide-react';`;
    const fbDecl = `const __LucideFallback = (props) => React.createElement('svg', Object.assign({ viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, props), React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 12 }), React.createElement('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }));`;

    const hasNs = code.includes(nsLine);
    const hasFb = code.includes('const __LucideFallback =');
    const hasFbRef = code.includes('__LucideFallback');

    if (hasNs && hasFbRef) {
      // 1. Strip all existing __LucideFallback declarations (may be misplaced or duplicated)
      if (hasFb) {
        code = code.replace(/^const __LucideFallback\s*=.*$/m, '');
      }

      // 2. Deduplicate the namespace import (keep only the first occurrence)
      let seenNs = false;
      code = code.split('\n').filter(line => {
        if (line.trim() === nsLine) {
          if (seenNs) return false;
          seenNs = true;
        }
        return true;
      }).join('\n');

      // 3. Insert fallback declaration immediately after the namespace import
      code = code.replace(nsLine, nsLine + '\n' + fbDecl);
    }
  }

  // ── Auto-inject missing lucide icon references ────────────────────────
  // AI sometimes uses lucide icon names (e.g. `icon: Database`) without
  // importing them. Detect PascalCase identifiers that look like lucide
  // icons but have no declaration, and inject safe proxy declarations.
  const COMMON_LUCIDE_ICONS = new Set([
    'Activity','AlertCircle','AlertTriangle','Archive','ArrowDown','ArrowLeft',
    'ArrowRight','ArrowUp','Award','BarChart','Bell','Bookmark','Box','Briefcase',
    'Calendar','Camera','Check','CheckCircle','ChevronDown','ChevronLeft',
    'ChevronRight','ChevronUp','Circle','Clock','Cloud','Code','Coffee',
    'Cpu','CreditCard','Database','Download','Edit','ExternalLink','Eye',
    'EyeOff','Facebook','File','FileText','Film','Filter','Flag','Folder',
    'Gift','Github','Globe','Grid','Hash','Heart','HelpCircle','Home',
    'Image','Inbox','Info','Instagram','Key','Layers','Layout','Link',
    'List','Loader','Lock','LogIn','LogOut','Mail','Map','MapPin','Menu',
    'MessageCircle','MessageSquare','Mic','Monitor','Moon','MoreHorizontal',
    'MoreVertical','Move','Music','Navigation','Package','Paperclip','Pause',
    'PenTool','Phone','PieChart','Play','Plus','Pocket','Power','Printer',
    'Radio','RefreshCw','Repeat','RotateCw','Rss','Save','Search','Send',
    'Server','Settings','Share','Shield','ShoppingBag','ShoppingCart','Sidebar',
    'Slash','Sliders','Smartphone','Speaker','Square','Star','Sun','Sunrise',
    'Sunset','Tablet','Tag','Target','Terminal','ThumbsDown','ThumbsUp',
    'ToggleLeft','ToggleRight','Tool','Trash','TrendingDown','TrendingUp',
    'Triangle','Truck','Tv','Twitter','Type','Umbrella','Underline','Unlock',
    'Upload','User','UserCheck','UserPlus','UserX','Users','Video','Voicemail',
    'Volume','Watch','Wifi','Wind','X','XCircle','Youtube','Zap','ZapOff',
    'Rocket','Sparkles','Wand','Bot','Brain','Lightbulb','Flame','Crown',
    'Gem','HandHeart','Headphones','Languages','Laugh','PaintBucket','Palette',
    'Puzzle','Receipt','Scale','ScrollText','Shrub','Wrench',
  ]);

  // Find all PascalCase identifiers used in the body (outside imports/declarations)
  const bodyWithoutDecls = code.replace(/^(?:import\s+.*|const\s+\w+\s*=).*$/gm, '');
  const usedIdentifiers = new Set<string>();
  const identRe = /\b([A-Z][a-zA-Z0-9]+)\b/g;
  let idMatch: RegExpExecArray | null;
  while ((idMatch = identRe.exec(bodyWithoutDecls)) !== null) {
    usedIdentifiers.add(idMatch[1]);
  }

  // Check which are missing declarations
  const missingIcons: string[] = [];
  for (const name of usedIdentifiers) {
    if (!COMMON_LUCIDE_ICONS.has(name)) continue;
    // Check if already declared (import, const, function, class)
    const declRe = new RegExp(`(?:import\\s+.*\\b${name}\\b|const\\s+${name}\\s*=|function\\s+${name}\\b|class\\s+${name}\\b)`, 'm');
    if (!declRe.test(code)) {
      missingIcons.push(name);
    }
  }

  if (missingIcons.length > 0) {
    // Inject lucide proxy declarations for missing icons
    const hasLucideNamespace = code.includes("import * as __LucideIcons from 'lucide-react'");
    const hasFallbackDecl = code.includes('const __LucideFallback =');
    const injections: string[] = [];
    if (!hasLucideNamespace) {
      injections.push(`import * as __LucideIcons from 'lucide-react';`);
    }
    // Always ensure fallback is declared BEFORE lookup lines we emit, even if
    // the namespace import already exists — otherwise lookups TDZ-crash on
    // `__LucideFallback`.
    if (!hasFallbackDecl) {
      injections.push(`const __LucideFallback = (props) => React.createElement('svg', Object.assign({ viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, props), React.createElement('circle', { cx: 12, cy: 12, r: 10 }), React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 12 }), React.createElement('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }));`);
    }
    for (const name of missingIcons) {
      injections.push(`const ${name} = __LucideIcons['${name}'] || __LucideFallback;`);
    }
    // Insert after the fallback declaration when it already exists; otherwise
    // insert after the last import. This preserves the invariant that every
    // `const Icon = ... || __LucideFallback` line appears below the fallback.
    const fallbackDeclMatch = code.match(/^const __LucideFallback\s*=.*$/m);
    if (fallbackDeclMatch?.index !== undefined) {
      const fallbackLineEnd = code.indexOf('\n', fallbackDeclMatch.index);
      const insertAt = fallbackLineEnd === -1 ? code.length : fallbackLineEnd + 1;
      code = code.slice(0, insertAt) + injections.join('\n') + '\n' + code.slice(insertAt);
    } else {
      const lastImportIdx = code.lastIndexOf('\nimport ');
      if (lastImportIdx !== -1) {
        const lineEnd = code.indexOf('\n', lastImportIdx + 1);
        code = code.slice(0, lineEnd + 1) + injections.join('\n') + '\n' + code.slice(lineEnd + 1);
      } else {
        code = injections.join('\n') + '\n' + code;
      }
    }
  }

  // ── Safe framer-motion imports ─────────────────────────────────────────
  // The AI frequently imports { motion, AnimatePresence } from 'framer-motion'.
  // If framer-motion fails to load or specific exports are missing, provide safe fallbacks.
  code = code.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]framer-motion['"];?/g,
    (_match, names: string) => {
      const fmNames = names.split(',')
        .map(n => n.trim())
        .filter(Boolean)
        .map(n => {
          const parts = n.split(/\s+as\s+/);
          return { original: parts[0].trim(), alias: (parts[1] || parts[0]).trim() };
        });
      if (fmNames.length === 0) return _match;

      const lines: string[] = [
        `import * as __FramerMotion from 'framer-motion';`,
        // motion fallback: a Proxy that returns the HTML tag as a plain element
        `const __motionFallback = typeof Proxy !== 'undefined' ? new Proxy({}, { get: (_, tag) => (props) => React.createElement(String(tag), Object.fromEntries(Object.entries(props || {}).filter(([k]) => !k.startsWith('while') && !k.startsWith('animate') && !k.startsWith('initial') && !k.startsWith('exit') && !k.startsWith('transition') && !k.startsWith('variants') && k !== 'layout' && k !== 'layoutId'))) }) : {};`,
        `const __AnimatePresenceFallback = ({ children }) => React.createElement(React.Fragment, null, children);`,
      ];
      for (const { original, alias } of fmNames) {
        if (original === 'motion') {
          lines.push(`const ${alias} = __FramerMotion['motion'] || __motionFallback;`);
        } else if (original === 'AnimatePresence') {
          lines.push(`const ${alias} = __FramerMotion['AnimatePresence'] || __AnimatePresenceFallback;`);
        } else {
          lines.push(`const ${alias} = __FramerMotion['${original}'] || (() => null);`);
        }
      }
      return lines.join('\n');
    }
  );

  let processed = code;
  const hooksShimImport = toRelativeSandpackImport(filePath, '/hooks-shim');

  processed = repairMalformedDefaultExportClosures(processed);

  // Strip leaked markdown code-fence artifacts (```, </code></pre>)
  processed = processed.replace(/\s*```\s*$/g, '');
  processed = processed.replace(/\s*<\/code>\s*<\/pre>\s*$/g, '');
  processed = processed.replace(/^```(?:html|jsx|tsx|javascript|js|typescript|ts)?\s*\n/g, '');

  // FIX: Repair broken template-literal image URLs generated by AI
  // e.g. src={`https://images.unsplash.com/photo-15${7003211169-...}`} → plain string URLs
  // These contain invalid JS expressions inside ${} that crash Babel
  processed = processed.replace(
    /\{`(https?:\/\/[^`]*?\$\{[^}]*\}[^`]*?)`\}/g,
    (_match, inner: string) => {
      // Detect broken template expressions: arithmetic on Unsplash IDs, commas, queries, etc.
      const hasInvalidExpr = /\$\{[^}]*[,?|&]/.test(inner) ||
        /\$\{\s*\d+[a-zA-Z-]/.test(inner) ||         // e.g. ${1472099645785-5658abf4ff4e}
        /\$\{[^}]*\+[^}]*\}/.test(inner) ||           // e.g. ${someId + i}
        /\$\{[^}]*photo-/.test(inner);                 // e.g. ${...photo-xxx...}
      if (hasInvalidExpr) {
        // Try to extract a clean Unsplash photo URL
        const urlMatch = inner.match(/(https?:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+)\??/);
        if (urlMatch) {
          return `"${urlMatch[1]}?w=800&q=80"`;
        }
        // Fallback: strip template literal syntax entirely
        const cleaned = inner.replace(/\$\{[^}]*\}/g, '').replace(/[`{}]/g, '');
        const firstUrl = cleaned.match(/(https?:\/\/[^\s"',]+)/);
        return `"${firstUrl ? firstUrl[1] : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'}"`;
      }
      return _match;
    }
  );

  // FIX: Convert dangerouslySetInnerHTML={{ __html: `...CSS...` }} to use a string constant
  // Babel crashes when template literals contain CSS syntax like :root { --var: value }
  processed = processed.replace(
    /dangerouslySetInnerHTML=\{\{\s*__html:\s*`([\s\S]*?)`\s*\}\}/g,
    (_match, cssContent: string) => {
      // Only fix if content looks like CSS (not simple HTML)
      if (/:root|@import|@font-face|@media|@keyframes|--[\w-]+\s*:/.test(cssContent)) {
        const jsonStr = JSON.stringify(cssContent);
        return `dangerouslySetInnerHTML={{ __html: ${jsonStr} }}`;
      }
      return _match;
    }
  );

  // Handle @/ path alias imports — convert to correct relative paths for flattened Sandpack files
  processed = processed.replace(
    /^(import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"])@\/([^'"]+)(['"];?\s*)$/gm,
    (match, importPrefix, modulePath, importSuffix) => {
      // Shim @/lib/utils → real cn() function
      if (modulePath === 'lib/utils') {
        const utilsShimImport = toRelativeSandpackImport(filePath, '/lib-utils-shim');
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${utilsShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${utilsShimImport}';`;
        return `import { cn } from '${utilsShimImport}';`;
      }

      // Shim @/components/ui/* → real React component stubs
      if (modulePath.startsWith('components/ui/') || modulePath.startsWith('components/ui')) {
        const uiShimImport = toRelativeSandpackImport(filePath, '/ui-shim');
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${uiShimImport}';`;
        if (defaultMatch) {
          const exportName = resolveUiShimDefaultImportName(modulePath, defaultMatch[1]);
          return `import { ${formatNamedImport(exportName, defaultMatch[1])} } from '${uiShimImport}';`;
        }
        return match.replace(/@\/[^'"]+/, uiShimImport.replace(/^\.\//, './'));
      }

      if (modulePath.startsWith('hooks/') || modulePath === 'hooks') {
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${hooksShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${hooksShimImport}';`;
        return `import hooks from '${hooksShimImport}'; // [Preview] Shimmed: @/${modulePath}`;
      }

      if (modulePath.startsWith('integrations/supabase')) {
        const namedMatch = match.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = match.match(/import\s+(\w+)\s+from/);
        if (namedMatch) return `import { ${namedMatch[1]} } from '${hooksShimImport}';`;
        if (defaultMatch) return `import ${defaultMatch[1]} from '${hooksShimImport}';`;
        return `import { supabase } from '${hooksShimImport}'; // [Preview] Shimmed: @/${modulePath}`;
      }

      return `${importPrefix}${aliasModuleToRelativeImport(filePath, `@/${modulePath}`)}${importSuffix}`;
    }
  );

  // Process remaining imports — strip unresolvable npm packages to prevent Sandpack crashes
  processed = processed.replace(
    /^import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"];?\s*$/gm,
    (match, modulePath) => {
      const baseModule = modulePath.split('/')[0];
      if (ALLOWED_IMPORTS.has(modulePath) || ALLOWED_IMPORTS.has(baseModule)) return match;
      if (/\.(css|scss|less)$/.test(modulePath)) return match;

      if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        // Redirect relative components/ui/* imports to the UI shim
        if (/components\/ui(\/|$)/.test(modulePath)) {
          const uiShimImport = toRelativeSandpackImport(filePath, '/ui-shim');
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '${uiShimImport}';`;
            if (defaultImport) {
              const exportName = resolveUiShimDefaultImportName(modulePath, defaultImport);
              return `import { ${formatNamedImport(exportName, defaultImport)} } from '${uiShimImport}';`;
            }
          }
          return match;
        }
        // Redirect relative lib/utils imports to the utils shim
        if (/lib\/utils/.test(modulePath)) {
          const utilsShimImport = toRelativeSandpackImport(filePath, '/lib-utils-shim');
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '${utilsShimImport}';`;
            if (defaultImport) return `import ${defaultImport} from '${utilsShimImport}';`;
          }
          return match;
        }
        if (modulePath.includes('hooks/')) {
          const importMatch = match.match(/import\s+(?:\{([^}]+)\}|([\w]+))/);
          if (importMatch) {
            const namedImports = importMatch[1];
            const defaultImport = importMatch[2];
            if (namedImports) return `import { ${namedImports} } from '${hooksShimImport}';`;
            if (defaultImport) return `import ${defaultImport} from '${hooksShimImport}';`;
          }
          return `import hooks from '${hooksShimImport}'; // [Preview] Shimmed: ${modulePath}`;
        }
        return match;
      }

      if (modulePath.startsWith('@/')) {
        return match.replace(modulePath, aliasModuleToRelativeImport(filePath, modulePath));
      }

      // Unknown npm package — pass through to Sandpack for real resolution.
      // The dependency extractor will pick it up and add it to customSetup.dependencies.
      return match;
    }
  );

  // Remove unsupported hook calls
  const unsupportedHooks = [
    'useAssetRegistry', 'useTemplateState', 'useGoHighLevelCRM', 'useSupabaseClient',
  ];
  for (const hook of unsupportedHooks) {
    processed = processed.replace(
      new RegExp(`const\\s+\\{[^}]*\\}\\s*=\\s*${hook}\\([^)]*\\);?`, 'g'),
      `// [Preview] Stripped ${hook} call`
    );
    processed = processed.replace(
      new RegExp(`const\\s+\\w+\\s*=\\s*${hook}\\([^)]*\\);?`, 'g'),
      `// [Preview] Stripped ${hook} call`
    );
    processed = processed.replace(
      new RegExp(`${hook}\\([^)]*\\)`, 'g'),
      '{}'
    );
  }

  processed = processed.replace(/\n{3,}/g, '\n\n');
  return processed;
}

/**
 * Normalize raw launcher/wizard VFS files before handing off to the Web Builder.
 * Ensures consistent paths, entry files, and CSS tokens.
 */
function normalizeLauncherPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (/^\/(App|main|index)\.(tsx|jsx|ts|js)$/.test(normalized) || normalized === '/index.css') {
    return `/src${normalized}`;
  }

  if (/^\/(pages|components|styles)\//.test(normalized)) {
    return `/src${normalized}`;
  }

  return normalized;
}

function isBootstrapSourceEntry(path?: string | null): boolean {
  return !!path && /\/(main|index)\.(tsx|jsx|ts|js)$/.test(path);
}

function pickRenderableLauncherEntry(
  files: Record<string, string>,
  preferredEntryPoint?: string,
): string | null {
  const normalizedPreferred = preferredEntryPoint ? normalizeLauncherPath(preferredEntryPoint) : null;

  if (normalizedPreferred && files[normalizedPreferred] && !isBootstrapSourceEntry(normalizedPreferred)) {
    return normalizedPreferred;
  }

  return (
    Object.keys(files).find((path) => /\/src\/pages\/(Home|Index)[^/]*\.(tsx|jsx)$/i.test(path)) ||
    Object.keys(files).find((path) => /\/src\/pages\/.+\.(tsx|jsx)$/.test(path)) ||
    Object.keys(files).find(
      (path) =>
        /\/src\/.+\.(tsx|jsx)$/.test(path) &&
        !/\/(App|main|index)\.(tsx|jsx)$/.test(path),
    ) ||
    null
  );
}

export function normalizeLauncherFiles(
  files: Record<string, string>,
  options?: { entryPoint?: string; themePresetId?: string | null }
): Record<string, string> {
  // ── Unwrap JSON envelope leaked into file content ──────────────────────
  // The AI sometimes wraps output in {"files":{...}} — if ANY file's content
  // is such a wrapper, extract the inner files and replace the input map.
  let resolvedFiles = files;
  for (const [fPath, fContent] of Object.entries(files)) {
    if (typeof fContent === 'string' && fContent.trimStart().startsWith('{')) {
      try {
        const parsed = JSON.parse(fContent);
        if (parsed && typeof parsed === 'object' && parsed.files && typeof parsed.files === 'object') {
          console.warn(`[normalizeLauncherFiles] Unwrapping JSON envelope in ${fPath}`);
          resolvedFiles = {};
          for (const [innerPath, innerContent] of Object.entries(parsed.files)) {
            if (typeof innerContent === 'string') {
              resolvedFiles[innerPath] = innerContent;
            }
          }
          // Also check for entryPoint in the JSON envelope
          if (parsed.entryPoint && !options?.entryPoint) {
            options = { ...options, entryPoint: parsed.entryPoint };
          }
          break;
        }
      } catch {
        // Not valid JSON — check if JSON is embedded mid-file
        const jsonIdx = fContent.indexOf('{"files"');
        if (jsonIdx > 0) {
          try {
            const embedded = JSON.parse(fContent.slice(jsonIdx));
            if (embedded?.files && typeof embedded.files === 'object') {
              console.warn(`[normalizeLauncherFiles] Extracting embedded JSON from ${fPath}`);
              resolvedFiles = {};
              for (const [innerPath, innerContent] of Object.entries(embedded.files)) {
                if (typeof innerContent === 'string') {
                  resolvedFiles[innerPath] = innerContent;
                }
              }
              if (embedded.entryPoint && !options?.entryPoint) {
                options = { ...options, entryPoint: embedded.entryPoint };
              }
              break;
            }
          } catch {
            // Not JSON either
          }
        }
      }
    }
  }

  const out: Record<string, string> = {};

  // Normalize all paths to have leading slash
  for (const [path, content] of Object.entries(resolvedFiles)) {
    const normalized = normalizeLauncherPath(path);
    // Sanitize image URLs and enforce contrast in all files
    let sanitized = content;
    if (/\.(tsx?|jsx?|css)$/.test(normalized)) {
      sanitized = repairBrokenImageUrls(sanitized);
    }
    if (normalized.endsWith('.css')) {
      sanitized = enforceContrastInCSS(sanitized);
    }
    if (/\.(tsx|jsx)$/.test(normalized)) {
      sanitized = ensureDefaultExportForReactModule(sanitized, normalized);
    }
    out[normalized] = sanitized;
  }

  // Ensure /src/main.tsx exists
  if (!out['/src/main.tsx']) {
    out['/src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  // Ensure /src/index.css exists — keyed on the wizard's resolved preset, never hard-coded
  if (!out['/src/index.css']) {
    out['/src/index.css'] = buildBaseCssForPreset(options?.themePresetId);
  }

  // ── Inject conventional IDE JSON / config files ──────────────────────────
  // Ensures the VFS looks like a real project with package.json, tsconfig, etc.
  if (!out['/package.json']) {
    const detectedDeps: Record<string, string> = { react: '^18.2.0', 'react-dom': '^18.2.0' };
    // Scan source for common imports to auto-populate dependencies
    const allCode = Object.values(out).join('\n');
    const importMatches = allCode.matchAll(/from\s+['"]([a-z@][a-z0-9\-_@/.]*)['"]/g);
    for (const m of importMatches) {
      const pkg = m[1].startsWith('@') ? m[1].split('/').slice(0, 2).join('/') : m[1].split('/')[0];
      if (pkg && !pkg.startsWith('.') && !pkg.startsWith('/') && !detectedDeps[pkg]) {
        detectedDeps[pkg] = 'latest';
      }
    }
    out['/package.json'] = JSON.stringify({
      name: 'vfs-project',
      private: true,
      version: '0.0.1',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
      },
      dependencies: detectedDeps,
      devDependencies: {
        '@vitejs/plugin-react-swc': '^3.5.0',
        typescript: '^5.3.0',
        vite: '^5.4.0',
        tailwindcss: '^3.4.0',
        autoprefixer: '^10.4.0',
        postcss: '^8.4.0',
      },
    }, null, 2);
  }

  if (!out['/tsconfig.json']) {
    out['/tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
        baseUrl: '.',
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src'],
    }, null, 2);
  }

  if (!out['/vite.config.ts']) {
    out['/vite.config.ts'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
`;
  }

  if (!out['/tailwind.config.ts']) {
    out['/tailwind.config.ts'] = `import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
`;
  }

  if (!out['/postcss.config.js']) {
    out['/postcss.config.js'] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
  }

  if (!out['/index.html']) {
    out['/index.html'] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VFS Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  }

  // Ensure /src/App.tsx exists — derive from entryPoint or first page component
  if (!out['/src/App.tsx'] && !out['/src/App.jsx']) {
    const targetImport = pickRenderableLauncherEntry(out, options?.entryPoint);

    if (targetImport) {
      const importPath = targetImport.replace('/src/', './').replace(/\.(tsx|jsx)$/, '');
      out['/src/App.tsx'] = `import React from 'react';
import Entry from '${importPath}';

export default function App() {
  return <Entry />;
}`;
    }
  }

  return out;
}

/**
 * Compile source VFS files (in /src/ structure) into a Sandpack-compatible overlay.
 * This is the canonical preview compiler — the SINGLE source of truth for preview prep.
 * 
 * Source VFS: /src/App.tsx, /src/main.tsx, /src/components/...
 * Sandpack overlay: /App.tsx, /index.tsx, /index.css, /components/...
 * 
 * Key rules:
 * - /src/ prefix is stripped (flattened to root)
 * - /main.tsx is ALWAYS renamed to /index.tsx (Sandpack react-ts entry point)
 * - /index.tsx is the ONLY valid entry — never /main.tsx
 * - Missing /App.tsx gets a proxy to the primary component
 * - Missing /index.tsx gets DEFAULT_INDEX injected
 */
export function prepareSandpackFiles(
  files: Record<string, string>,
  options?: { strict?: boolean; entryPoint?: string; aesthetic?: string; themePresetId?: string | null }
): Record<string, string> {
  // ═══════════════════════════════════════════════════════════════════════════
  // GUARD: Unwrap JSON-wrapped file maps that leaked through as raw content.
  // If ANY file's content is a JSON object with a "files" key, extract the
  // actual files and merge them into the VFS instead of treating the JSON
  // string as source code.
  // ═══════════════════════════════════════════════════════════════════════════
  let resolvedFiles = files;
  const fileKeys = Object.keys(files);

  // Case 1: The entire VFS has a single file whose content is a JSON files wrapper
  // e.g. { "/App.tsx": '{"files":{"src/App.tsx":"import React..."}}' }
  if (fileKeys.length === 1 || fileKeys.length <= 3) {
    for (const [fPath, fContent] of Object.entries(files)) {
      if (typeof fContent === 'string' && fContent.trim().length > 100 && fContent.trimStart().startsWith('{')) {
        try {
          const parsed = JSON.parse(fContent);
          if (parsed && typeof parsed === 'object' && parsed.files && typeof parsed.files === 'object') {
            console.warn(`[sandpackFilePrep] Detected JSON wrapper at ${fPath} — unwrapping nested files structure`);
            resolvedFiles = {};
            for (const [innerPath, innerContent] of Object.entries(parsed.files)) {
              if (typeof innerContent === 'string') {
                // Strip leading "src/" so "/src/App.tsx" becomes "/App.tsx"
                let normalizedInner = innerPath.startsWith('/') ? innerPath : `/${innerPath}`;
                normalizedInner = normalizedInner.replace(/^\/src\//, '/');
                // Recursively unwrap if innerContent is also a JSON string, passing the path hint
                const unwrappedContent = recursivelyUnwrapJson(innerContent, normalizedInner);
                resolvedFiles[normalizedInner] = unwrappedContent;
              }
            }
            console.log(`[sandpackFilePrep] Unwrapped ${Object.keys(resolvedFiles).length} files from JSON wrapper`);
            break; // Only one wrapper expected
          }
        } catch (e) {
          // Not JSON — continue normally
          console.warn(`[sandpackFilePrep] Attempted JSON parse of ${fPath} failed:`, (e as Error).message);
        }
      }
    }
  }

  // Case 2: Individual file content is a JSON wrapper (defensive per-file check)
  // This catches cases where a single file contains the full JSON structure
  const finalFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(resolvedFiles)) {
    if (typeof content === 'string' && content.trim().length > 100 && content.trimStart().startsWith('{')) {
      try {
        // Aggressive check: try to parse any large JSON-like content
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && parsed.files && typeof parsed.files === 'object' && Object.keys(parsed.files).length > 0) {
          console.warn(`[sandpackFilePrep] Per-file JSON structure detected in ${path} — extracting files`);
          for (const [innerPath, innerContent] of Object.entries(parsed.files)) {
            if (typeof innerContent === 'string') {
              let norm = innerPath.startsWith('/') ? innerPath : `/${innerPath}`;
              norm = norm.replace(/^\/src\//, '/');
              // Recursively unwrap if innerContent is also a JSON string, passing the path hint
              const unwrappedContent = recursivelyUnwrapJson(innerContent, norm);
              finalFiles[norm] = unwrappedContent;
            }
          }
          console.log(`[sandpackFilePrep] Extracted ${Object.keys(finalFiles).length} files from JSON in ${path}`);
          continue; // Skip adding this JSON wrapper as a file
        }
      } catch {
        // Not JSON — treat as normal file
      }
    }
    finalFiles[path] = content;
  }

  const sandpackFiles: Record<string, string> = {};
  let hasApp = false;
  let hasIndex = false;
  let hasCSS = false;
  const componentFilePaths: string[] = [];

  console.log('[sandpackFilePrep] Input VFS files:', Object.keys(finalFiles));

  for (const [path, content] of Object.entries(finalFiles)) {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Skip files Sandpack doesn't need
    if (normalizedPath.includes('node_modules') ||
        normalizedPath.includes('/.') ||
        normalizedPath.endsWith('.json') ||
        normalizedPath.endsWith('.config.ts') ||
        normalizedPath.endsWith('.config.js') ||
        normalizedPath.includes('/public/')) {
      continue;
    }

    // Flatten /src/ paths to root for Sandpack compatibility
    if (normalizedPath.startsWith('/src/')) {
      normalizedPath = normalizedPath.replace('/src/', '/');
    }

    // Flatten /styles/ to root
    if (normalizedPath.startsWith('/styles/')) {
      normalizedPath = normalizedPath.replace('/styles/', '/');
    }

    // *** CRITICAL FIX: Rename /main.tsx → /index.tsx ***
    // Sandpack react-ts template uses /index.tsx as its entry point, NOT /main.tsx.
    if (normalizedPath === '/main.tsx') {
      normalizedPath = '/index.tsx';
    } else if (normalizedPath === '/main.jsx') {
      normalizedPath = '/index.jsx';
    } else if (normalizedPath === '/main.ts') {
      normalizedPath = '/index.ts';
    }

    // Fix imports in content to match flattened paths
    let processedContent = content;

    // Repair legacy/generated payloads that serialized THEME as undefined/null.
    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && /const\s+THEME\s*=\s*(undefined|null);/.test(processedContent)) {
      processedContent = processedContent.replace(
        /const\s+THEME\s*=\s*(undefined|null);/,
        `const THEME = ${LAUNCHER_THEME_JSON};`
      );
    }

    // SAFETY NET: If a .tsx/.jsx file contains raw CSS instead of React code, wrap it
    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && isRawCss(processedContent)) {
      console.warn(`[sandpackFilePrep] Raw CSS detected in ${normalizedPath} — wrapping in React component`);
      processedContent = wrapCssInReactComponent(processedContent);
    }

    // SAFETY NET: Ensure React imports are present for files using hooks
    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && !isRawCss(processedContent)) {
      processedContent = ensureReactImports(processedContent);
      // Fix broken SVG elements (dc.path, svg.circle, etc.)
      processedContent = sanitizeSvgElements(processedContent);
      processedContent = forceClassicReactJsxRuntime(processedContent);
    }

    processedContent = processedContent
      .replace(/from\s+['"]\.\/src\//g, "from './")
      .replace(/from\s+['"]src\//g, "from './")
      .replace(/from\s+['"]\.\/styles\//g, "from './")
      .replace(/import\s+['"]\.\/styles\//g, "import './");

    processedContent = processCode(processedContent, normalizedPath);
    processedContent = repairBrokenImageUrls(processedContent);
    processedContent = injectPreviewNavBridge(processedContent, normalizedPath);
    sandpackFiles[normalizedPath] = processedContent;

    if (/\.(tsx?|jsx?)$/.test(normalizedPath) && normalizedPath !== '/hooks-shim.ts') {
      componentFilePaths.push(normalizedPath);
    }
    if (normalizedPath === '/App.tsx' || normalizedPath === '/App.jsx') hasApp = true;
    if (normalizedPath === '/index.tsx' || normalizedPath === '/index.jsx') hasIndex = true;
    if (normalizedPath.endsWith('.css')) hasCSS = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THEME THREADING (canonical): Apply the wizard-resolved Style-card preset
  // to ALL CSS files. The single source of truth is `themePresetId` (or its
  // alias `aesthetic`); we delegate to buildBaseCssForPreset() so the SAME
  // token system used by the launcher VFS is used here too.
  // ─────────────────────────────────────────────────────────────────────────
  const resolvedPresetId = options?.themePresetId || (options?.aesthetic && isValidAesthetic(options.aesthetic) ? options.aesthetic : null);
  const themedCSS = resolvedPresetId ? buildBaseCssForPreset(resolvedPresetId) : '';

  if (themedCSS) {
    console.log(`[prepareSandpackFiles] Applying themePresetId: ${resolvedPresetId}`);

    // Overwrite (not prepend) every existing CSS file so the wizard preset is
    // authoritative across multi-file VFS structures. Prepend caused stale
    // tokens to win for non-store industries (salon/coaching) — see prior fix.
    for (const [filePath] of Object.entries(sandpackFiles)) {
      if (filePath.endsWith('.css') && !filePath.includes('shim')) {
        sandpackFiles[filePath] = themedCSS;
      }
    }
  }

  if (!hasCSS) {
    // No CSS file exists — create /index.css from the resolved preset (or default)
    sandpackFiles['/index.css'] = themedCSS || BASE_CSS;
  } else if (!themedCSS) {
    // CSS exists but no preset resolved — ensure semantic vars are present
    const existingIndexCSS = sandpackFiles['/index.css'] || '';
    if (existingIndexCSS && !existingIndexCSS.includes('--primary:')) {
      sandpackFiles['/index.css'] = SEMANTIC_CSS_VARS + '\n' + existingIndexCSS;
    }
  }

  // Enforce contrast on final CSS
  if (sandpackFiles['/index.css']) {
    sandpackFiles['/index.css'] = enforceContrastInCSS(sandpackFiles['/index.css']);
  }

  if (!hasApp) {
    if (options?.strict && options?.entryPoint) {
      // In strict mode with explicit entry, create proxy to that entry
      const entryFlattened = options.entryPoint.replace(/^\/src\//, '/');
      if (sandpackFiles[entryFlattened]) {
        sandpackFiles['/App.tsx'] = createProxyApp(entryFlattened);
      } else {
        sandpackFiles['/App.tsx'] = createMissingEntryApp();
      }
    } else {
      const primaryComponentPath = pickPrimaryComponentPath(componentFilePaths);
      if (primaryComponentPath) {
        sandpackFiles['/App.tsx'] = createProxyApp(primaryComponentPath);
      } else {
        sandpackFiles['/App.tsx'] = createMissingEntryApp();
      }
    }
  }

  // ALWAYS use our controlled entry point — it includes the createElement safety
  // guard, error boundary, Tailwind CDN config, and nav bridge. VFS-provided
  // index.tsx/main.tsx are just boilerplate mounts that lack these protections.
  sandpackFiles['/index.tsx'] = DEFAULT_INDEX;

  // Remove any stale /main.tsx that might have leaked through
  delete sandpackFiles['/main.tsx'];
  delete sandpackFiles['/main.jsx'];

  sandpackFiles['/hooks-shim.ts'] = HOOKS_SHIM;
  sandpackFiles['/lib-utils-shim.ts'] = LIB_UTILS_SHIM;
  sandpackFiles['/ui-shim.tsx'] = UI_COMPONENTS_SHIM;

  // ── SAFETY: Strip Router wrappers from non-App files ──
  // If App.tsx already has a Router, any page component that also wraps itself
  // in <BrowserRouter>/<HashRouter>/<Router> will cause a "cannot render Router
  // inside another Router" crash. Strip them from all non-App files.
  // Also handles aliased usage like `BrowserRouter as Router` → `<Router>`.
  const appFile = sandpackFiles['/App.tsx'] || sandpackFiles['/App.jsx'] || '';
  const appHasRouter = /(?:BrowserRouter|HashRouter|MemoryRouter|Router)\s*>/.test(appFile);
  if (appHasRouter) {
    for (const [filePath, content] of Object.entries(sandpackFiles)) {
      if (filePath === '/App.tsx' || filePath === '/App.jsx') continue;
      if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;

      // Detect aliased router imports like `BrowserRouter as Router`
      const aliasMatch = content.match(/(?:BrowserRouter|HashRouter|MemoryRouter)\s+as\s+(\w+)/);
      const routerAlias = aliasMatch ? aliasMatch[1] : null;

      // Build list of all Router-like tag names to strip
      const routerTags = ['BrowserRouter', 'HashRouter', 'MemoryRouter'];
      if (routerAlias && !routerTags.includes(routerAlias)) {
        routerTags.push(routerAlias);
      }
      const routerTagPattern = routerTags.join('|');
      const tagRegex = new RegExp(`(?:${routerTagPattern})\\s*>`, '');

      if (tagRegex.test(content)) {
        const fixed = content
          .replace(/import\s*\{[^}]*(?:BrowserRouter|HashRouter|MemoryRouter)[^}]*\}\s*from\s*['"]react-router-dom['"];?\n?/g, (match) => {
            // Keep non-Router imports from the same line
            const keepTokens = ['Routes', 'Route', 'Link', 'Navigate', 'useNavigate', 'useLocation', 'useParams', 'NavLink', 'Outlet'];
            const otherImports = match.match(new RegExp(`\\b(?:${keepTokens.join('|')})\\b`, 'g'));
            if (otherImports && otherImports.length > 0) {
              return `import { ${otherImports.join(', ')} } from 'react-router-dom';\n`;
            }
            return '';
          })
          .replace(new RegExp(`<(?:${routerTagPattern})(?:\\s[^>]*)?>`, 'g'), '')
          .replace(new RegExp(`</(?:${routerTagPattern})>`, 'g'), '');
        if (fixed !== content) {
          sandpackFiles[filePath] = fixed;
          console.warn(`[sandpackFilePrep] Stripped nested Router from ${filePath}`);
        }
      }
    }
  }

  // ── AUTO-INJECT imports for JSX-used but un-imported components ──
  // AI often generates <Gallery /> in App.tsx without a corresponding import.
  // Detect PascalCase JSX usage and inject missing import statements before
  // the generateMissingComponents pass (which only scans import statements).
  autoInjectMissingJsxImports(sandpackFiles);

  // ── Generate real components for missing relative imports ──
  // Run BEFORE App.tsx export validation so generated sub-components exist first.
  // Run up to 3 passes to resolve transitive imports (generated components may import others).
  // Re-run autoInjectMissingJsxImports each pass so generated files also get imports injected.
  for (let pass = 0; pass < 3; pass++) {
    const beforeCount = Object.keys(sandpackFiles).length;
    generateMissingComponents(sandpackFiles);
    if (Object.keys(sandpackFiles).length === beforeCount) break;
    console.log(`[sandpackFilePrep] Component generation pass ${pass + 1}: ${Object.keys(sandpackFiles).length - beforeCount} new files`);
    autoInjectMissingJsxImports(sandpackFiles);
  }

  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    if (/\.(tsx?|jsx?)$/.test(filePath)) {
      sandpackFiles[filePath] = repairMalformedDefaultExportClosures(content);
    }
  }

  repairLocalImportContracts(sandpackFiles);

  // ── SAFETY: Validate App.tsx has a default export ──
  // If AI-generated App.tsx only uses named exports (e.g., `export function App`),
  // `import App from './App'` in index.tsx resolves to undefined → crash.
  // Must run AFTER generateMissingComponents so all files are present.
  const appContent = sandpackFiles['/App.tsx'] || sandpackFiles['/App.jsx'] || '';
  if (appContent && !appContent.includes('export default')) {
    const appPath = sandpackFiles['/App.tsx'] ? '/App.tsx' : '/App.jsx';
    const ensured = ensureDefaultExportForReactModule(appContent, appPath);
    if (ensured !== appContent) {
      const exportName = findBestComponentExportName(appContent, appPath);
      sandpackFiles[appPath] = ensured;
      console.warn(`[sandpackFilePrep] App.tsx missing default export — added: export default ${exportName}`);
    } else {
      // No usable export found — wrap in a proxy
      sandpackFiles['/App.tsx'] = createMissingEntryApp();
      console.warn('[sandpackFilePrep] App.tsx has no valid exports — replaced with diagnostic entry');
    }
  }

  // ── SAFETY: Validate ALL generated .tsx/.jsx files have a default export ──
  // Prevents "Element type is invalid" when any component is default-imported.
  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    if (!/\.(tsx|jsx)$/.test(filePath)) continue;
    if (filePath === '/index.tsx' || filePath === '/hooks-shim.ts') continue;
    if (content.includes('export default')) continue;

    sandpackFiles[filePath] = ensureDefaultExportForReactModule(content, filePath);
  }

  // ── CLEANUP: Remove unused imports from VFS files ──
  // AI often imports components/icons it doesn't actually use in the template,
  // producing "'X' is declared but its value is never read" warnings.
  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    if (!/\.(tsx|jsx|ts|js)$/.test(filePath)) continue;
    sandpackFiles[filePath] = removeUnusedImports(content);
  }

  // ── CLEANUP: Strip non-null assertions from .jsx files ──
  // TypeScript non-null assertions (foo!) are invalid in plain .jsx files.
  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    if (!filePath.endsWith('.jsx')) continue;
    // Replace non-null assertions: identifier! followed by . or [ or ) or , or ;
    sandpackFiles[filePath] = content.replace(/(\w)!(?=[[.),;\s}])/g, '$1');
  }

  // Ensure template.css exists if any file imports it
  const anyImportsTemplateCss = Object.values(sandpackFiles).some(c =>
    typeof c === 'string' && /import\s+['"]\.\/template\.css['"]/.test(c)
  );
  if (anyImportsTemplateCss && !sandpackFiles['/template.css']) {
    sandpackFiles['/template.css'] = '/* template styles */\n';
  }

  // Ensure index.html exists with Tailwind CDN + semantic theme config
  if (!sandpackFiles['/index.html']) {
    sandpackFiles['/index.html'] = PREVIEW_INDEX_HTML;
  }

  // ── FINAL SAFETY: Detect any remaining JSON wrappers that leaked through ──
  // This catches cases where the unwrapping logic missed nested or double-serialized JSON.
  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    if (!/\.(tsx|jsx|ts|js)$/.test(filePath)) continue;
    if (typeof content === 'string' && content.trim().startsWith('{"files"')) {
      console.error(
        `[sandpackFilePrep] CRITICAL: File ${filePath} still contains unparsed JSON! ` +
        `First 100 chars: ${content.substring(0, 100)}`
      );
      // Try one more aggressive unwrap
      try {
        const parsed = JSON.parse(content);
        if (parsed?.files && typeof parsed.files === 'object') {
          const unwrapped = recursivelyUnwrapJson(content, filePath);
          if (unwrapped !== content) {
            console.warn(`[sandpackFilePrep] Applied final unwrap to ${filePath}`);
            sandpackFiles[filePath] = unwrapped;
          }
        }
      } catch (e) {
        console.error(`[sandpackFilePrep] Final unwrap attempt failed for ${filePath}:`, (e as Error).message);
      }
    }
  }

  console.log('[sandpackFilePrep] Prepared files:', Object.keys(sandpackFiles));
  return sandpackFiles;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURSIVE JSON UNWRAPPER: Handle deeply nested JSON strings
// When a file's content is itself a JSON object with a "files" structure,
// extract and recursively unwrap the actual component code.
// ─────────────────────────────────────────────────────────────────────────────
function recursivelyUnwrapJson(content: string, hintPath?: string, depth = 0): string {
  // Prevent infinite recursion
  if (depth > 5) {
    console.warn(`[recursivelyUnwrapJson] Max depth (5) reached, returning content as-is`);
    return content;
  }

  // Check if content is a JSON string
  if (typeof content !== 'string') return content;
  if (!content.trim().startsWith('{')) return content;
  if (content.trim().length < 50) return content; // Too small to be meaningful JSON

  try {
    const parsed = JSON.parse(content);
    
    // If it's a files object, extract the appropriate file
    if (parsed && typeof parsed === 'object' && parsed.files && typeof parsed.files === 'object') {
      const files = parsed.files as Record<string, string>;
      let extractedContent: string | undefined;
      
      // Strategy 1: If hint path provided, try exact paths variations
      if (hintPath) {
        const variations = [
          hintPath,
          '/' + hintPath.replace(/^\//, ''),
          hintPath.replace(/^\/src\//, '/'),
          '/' + hintPath.replace(/^\//, '').replace(/^src\//, ''),
          'src/' + hintPath.replace(/^\/|^src\//, ''),
          hintPath.split('/').pop(), // Just filename
        ];
        for (const variant of variations) {
          if (files[variant]) {
            extractedContent = files[variant];
            break;
          }
        }
      }
      
      // Strategy 2: If no hint or hint didn't work, find the most likely file
      // (usually the file with most content, or .tsx/.jsx files first)
      if (!extractedContent) {
        const sortedFiles = Object.entries(files)
          .sort(([aPath], [bPath]) => {
            const aIsTsx = /\.(tsx|jsx)$/.test(aPath);
            const bIsTsx = /\.(tsx|jsx)$/.test(bPath);
            if (aIsTsx && !bIsTsx) return -1;
            if (!aIsTsx && bIsTsx) return 1;
            return (files[bPath]?.length || 0) - (files[aPath]?.length || 0); // Longer first
          });
        
        if (sortedFiles.length > 0) {
          extractedContent = sortedFiles[0][1];
        }
      }
      
      if (extractedContent && typeof extractedContent === 'string') {
        // Recursively unwrap the extracted content in case it's also JSON-wrapped
        return recursivelyUnwrapJson(extractedContent, hintPath, depth + 1);
      }
    }
    
    // If it's just plain JSON (not a files object), return original
    return content;
  } catch {
    // Not valid JSON — return as-is
    return content;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SiteBundle → VFS Compiler
// ═══════════════════════════════════════════════════════════════════════════════
// This is the CANONICAL path for SiteBundle → preview. All preview rendering
// flows through prepareSandpackFiles(). This function converts a SiteBundle
// into a standard /src/ VFS that prepareSandpackFiles() can then compile into
// a Sandpack-ready overlay.
//
// Architecture:
//   SiteBundle → compileSiteBundleToVFS() → /src/ VFS → prepareSandpackFiles() → Sandpack
//
// There is NO alternative preview path. The old SandpackRuntimeWrapper has been removed.
// ═══════════════════════════════════════════════════════════════════════════════

interface SiteBundlePage {
  path: string;
  title?: string;
  output?: { html?: string; react?: string };
  sections?: Array<{ type: string; html?: string }>;
}

interface SiteBundleCompileConfig {
  siteBundle: {
    pages?: Record<string, SiteBundlePage> | SiteBundlePage[];
    theme?: Record<string, any>;
    metadata?: { name?: string; industry?: string };
  };
  entryPath?: string;
  debug?: boolean;
}

/**
 * Compile a SiteBundle into a source VFS (/src/ structure).
 * The result can be passed directly to prepareSandpackFiles() for Sandpack rendering,
 * or stored in the VFS context for editor use.
 *
 * This replaces the old SandpackRuntimeWrapper.generateSandpackFiles().
 */
export function compileSiteBundleToVFS(config: SiteBundleCompileConfig): Record<string, string> {
  const { siteBundle, entryPath = '/', debug = false } = config;
  const pages: SiteBundlePage[] = siteBundle.pages
    ? Array.isArray(siteBundle.pages) ? siteBundle.pages : Object.values(siteBundle.pages)
    : [];

  const vfs: Record<string, string> = {};

  // 1. Generate page components
  for (const page of pages) {
    const compName = sanitizeSiteBundleComponentName(page.path);
    const fileName = sanitizeSiteBundleFilename(page.path);

    let pageCode: string;
    if (page.output?.react) {
      pageCode = page.output.react;
    } else {
      const html = page.output?.html || '<div>Page content not generated</div>';
      const jsx = html
        .replace(/ class="/g, ' className="')
        .replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
        .replace(/<br>/gi, '<br />')
        .replace(/<hr>/gi, '<hr />')
        .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />');

      pageCode = [
        "import React from 'react';",
        '',
        'export default function ' + compName + '() {',
        '  return (',
        '    <div className="page-container min-h-screen">',
        '      ' + jsx,
        '    </div>',
        '  );',
        '}',
      ].join('\n');
    }

    vfs['/src/pages/' + fileName + '.tsx'] = pageCode;
  }

  // 2. Generate App.tsx with routing
  const importLines = pages.map(p => {
    const name = sanitizeSiteBundleComponentName(p.path);
    const file = sanitizeSiteBundleFilename(p.path);
    return 'import ' + name + " from './pages/" + file + "';";
  });

  const routeLines = pages.map(p => {
    const name = sanitizeSiteBundleComponentName(p.path);
    return '        <Route path="' + p.path + '" element={<' + name + ' />} />';
  });

  vfs['/src/App.tsx'] = [
    "import React from 'react';",
    "import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';",
    ...importLines,
    '',
    'export default function App() {',
    '  return (',
    '    <HashRouter>',
    '      <Routes>',
    ...routeLines,
    '        <Route path="*" element={<Navigate to="' + entryPath + '" replace />} />',
    '      </Routes>',
    '    </HashRouter>',
    '  );',
    '}',
  ].join('\n');

  // 3. Generate main.tsx entry
  vfs['/src/main.tsx'] = [
    "import React from 'react';",
    "import ReactDOM from 'react-dom/client';",
    "import App from './App';",
    "import './index.css';",
    '',
    "ReactDOM.createRoot(document.getElementById('root')!).render(",
    '  <React.StrictMode>',
    '    <App />',
    '  </React.StrictMode>',
    ');',
  ].join('\n');

  // 4. Generate index.css with theme tokens
  let css = BASE_CSS;
  if (siteBundle.theme) {
    const themeVars = Object.entries(siteBundle.theme)
      .map(([k, v]) => '  --' + k + ': ' + v + ';')
      .join('\n');
    css = css.replace(':root {', ':root {\n' + themeVars);
  }
  vfs['/src/index.css'] = css;

  if (debug) {
    console.log('[compileSiteBundleToVFS] Generated VFS:', Object.keys(vfs));
  }

  return vfs;
}

function sanitizeSiteBundleFilename(path: string): string {
  if (path === '/' || path === '') return 'Home';
  return path.replace(/^\//, '').replace(/\//g, '-').replace(/[^\w-]/g, '').replace(/^-+|-+$/g, '') || 'Page';
}

function sanitizeSiteBundleComponentName(path: string): string {
  const filename = sanitizeSiteBundleFilename(path);
  const pascalName = filename
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
  return (pascalName || 'Page') + 'Page';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Canonical Launcher → Preview Compiler
// ═══════════════════════════════════════════════════════════════════════════════
// This is the SINGLE function that all launchers should call to produce a
// Sandpack-ready preview bundle. It combines normalization + compilation in
// one step, driven by a RuntimeManifest.
//
// Nothing else is allowed to feed Sandpack directly.
// ═══════════════════════════════════════════════════════════════════════════════

import type { RuntimeManifest, LauncherHandoff } from '@/types/runtimeManifest';

/**
 * The ONE canonical function that converts launcher output into a Sandpack-ready
 * preview bundle. All preview paths must flow through here.
 *
 * Usage:
 *   const { previewFiles, manifest } = compileLauncherOutputForPreview(handoff);
 *   // Feed previewFiles to Sandpack
 *   // Use manifest for engine selection, route awareness, etc.
 */
export function compileLauncherOutputForPreview(
  handoff: Pick<LauncherHandoff, 'sourceFiles' | 'runtimeManifest' | 'siteBundle'>
): { previewFiles: Record<string, string>; manifest: RuntimeManifest } {
  const { sourceFiles, runtimeManifest, siteBundle } = handoff;

  // Step 1: If we have a SiteBundle, compile it to source VFS and merge
  const mergedSource = { ...sourceFiles };
  if (siteBundle) {
    const siteBundleVFS = compileSiteBundleToVFS({
      siteBundle,
      entryPath: runtimeManifest.routes[0] || '/',
    });
    // SiteBundle VFS fills gaps — source files take priority
    for (const [path, content] of Object.entries(siteBundleVFS)) {
      if (!mergedSource[path]) {
        mergedSource[path] = content;
      }
    }
  }

  // Step 2: Normalize launcher files (fix paths, add entry files, repair images)
  const themePresetId =
    runtimeManifest.appContext?.themePresetId ||
    runtimeManifest.aesthetic ||
    null;
  const normalized = normalizeLauncherFiles(mergedSource, {
    entryPoint: runtimeManifest.entryPoint,
    themePresetId,
  });

  // Step 3: Compile to Sandpack overlay (flatten /src/, inject shims, apply themed CSS, etc.)
  const previewFiles = prepareSandpackFiles(normalized, {
    strict: true,
    entryPoint: runtimeManifest.entryPoint,
    aesthetic: runtimeManifest.aesthetic,  // legacy alias
    themePresetId,                         // canonical source of truth
  });

  console.log('[compileLauncherOutputForPreview] Compiled preview:', {
    sourceFileCount: Object.keys(sourceFiles).length,
    previewFileCount: Object.keys(previewFiles).length,
    engine: runtimeManifest.previewEngine,
    routes: runtimeManifest.routes,
    backendRequired: runtimeManifest.backendRequired,
    aesthetic: runtimeManifest.aesthetic,
  });

  return { previewFiles, manifest: runtimeManifest };
}
