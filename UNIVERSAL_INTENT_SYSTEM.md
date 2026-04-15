# Universal Intent System

> **Stack**: React 18 + TypeScript 5.9 | Runtime: `src/runtime/` (intentRouter, actionCatalog, intentResolver, intentClassifier) | Schema: `src/schemas/BusinessBlueprint.ts` (20+ intent types)

A deterministic, two-step intent resolution and routing system for AI-generated UIs. Ensures consistent button behavior across all generated websites.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUTTON CLICK                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              UNIVERSAL INTENT ROUTER                            │
│  (Event Delegation - ONE listener on canvas root)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
    ┌───────────▼───────────┐   ┌───────────▼───────────┐
    │  HAS data-ut-intent?  │   │   NEEDS RESOLUTION?   │
    │       (cached)        │   │   (builder mode only) │
    └───────────────────────┘   └───────────────────────┘
                │                           │
                │                           ▼
                │           ┌───────────────────────────┐
                │           │    INTENT RESOLVER        │
                │           │  1. Rule Engine (95%)     │
                │           │  2. AI Fallback (5%)      │
                │           └───────────────────────────┘
                │                           │
                │                           ▼
                │           ┌───────────────────────────┐
                │           │   ANNOTATE ELEMENT        │
                │           │   data-ut-intent="..."    │
                │           │   data-ut-payload="..."   │
                │           └───────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ACTION CATALOG                             │
│  Deterministic handlers - NO AI at runtime                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTE ACTION                               │
│  nav.goto → navigate | shop.add_to_cart → add to cart | etc    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

1. **AI resolves at BUILD TIME** - Intent resolution happens once per button
2. **Runtime is DETERMINISTIC** - Every click executes from the fixed Action Catalog
3. **No AI on click** - Fast, predictable, offline-capable
4. **Lazy annotation** - Buttons get resolved on first interaction if needed

## Core Components

### 1. Action Catalog (`src/runtime/actionCatalog.ts`)

The fixed catalog of deterministic action handlers. Every intent maps to exactly one handler.

```typescript
import { executeAction, isValidIntent } from '@/runtime/actionCatalog';

// Execute an action
await executeAction('shop.add_to_cart', {
  intent: 'shop.add_to_cart',
  payload: { productId: 'abc123', quantity: 1 },
  element: buttonEl,
});

// Check if intent is valid
if (isValidIntent('booking.open')) {
  // It's a valid catalog entry
}
```

#### Available Intents

| Category | Intent | Description |
|----------|--------|-------------|
| **Navigation** | `nav.goto_page` | Navigate to internal page |
| | `nav.scroll_to` | Scroll to anchor |
| | `nav.external` | Open external URL |
| | `nav.back` | Go back in history |
| **Commerce** | `shop.open_cart` | Open cart overlay |
| | `shop.add_to_cart` | Add product to cart |
| | `shop.remove_from_cart` | Remove from cart |
| | `shop.checkout` | Go to checkout |
| | `shop.apply_coupon` | Apply discount code |
| **Booking** | `booking.open` | Open booking modal |
| | `booking.submit` | Submit booking |
| | `booking.cancel` | Cancel booking |
| **Lead/Contact** | `lead.open_form` | Open contact form |
| | `lead.submit_form` | Submit lead form |
| | `quote.request` | Request a quote |
| **Communication** | `call.now` | Initiate phone call |
| | `email.now` | Open email client |
| **Auth** | `auth.sign_in` | Open sign in |
| | `auth.sign_up` | Open sign up |
| | `auth.sign_out` | Sign out user |
| **Newsletter** | `newsletter.submit` | Subscribe to newsletter |
| | `waitlist.join` | Join waitlist |
| **Social** | `social.share` | Share on platform |
| | `social.follow` | Follow on platform |
| | `social.copy_link` | Copy link to clipboard |

### 2. Intent Resolver (`src/runtime/intentResolver.ts`)

Resolves button text/context to an intent. Rules-first, AI-fallback.

```typescript
import { resolveIntent, extractButtonContext } from '@/runtime/intentResolver';

// Extract context from a button element
const ctx = extractButtonContext(buttonEl);
// { buttonText: "Book Now", componentType: "cta", pageType: "home", ... }

// Resolve intent (AI only in builder mode)
const result = await resolveIntent(ctx, true);
// { intent: "booking.open", confidence: 0.95, source: "rule" }
```

#### Resolution Priority

1. **Explicit intent** - `data-ut-intent` attribute already set
2. **Rule engine** - Pattern matching on button text (catches 95% of cases)
3. **AI fallback** - For ambiguous cases (builder mode only)

### 3. Universal Intent Router (`src/runtime/universalIntentRouter.ts`)

The orchestrator - attaches to a root element and handles all clicks.

```typescript
import { createIntentRouter, setupPreviewRouter } from '@/runtime/universalIntentRouter';

// For preview iframes
const router = setupPreviewRouter(iframe.contentDocument, {
  navigationManager: { /* custom handlers */ },
  overlayManager: { /* custom handlers */ },
});

// For production deployments
const router = setupProductionRouter(document.body, {
  mode: 'production',
  // All handlers are deterministic in production
});

// Pre-annotate all buttons at build time
const annotations = await router.annotateAll();

// Get HTML with intents embedded
const annotatedHtml = router.getAnnotatedHTML();
```

## React Integration

### useIntentRouter Hook

```typescript
import { useIntentRouter } from '@/hooks/useIntentRouter';

function WebBuilder() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const {
    attachToIframe,
    detach,
    annotateAll,
    getAnnotatedHTML,
    isAttached,
    lastIntent,
  } = useIntentRouter({
    mode: 'builder',
    debug: true,
    onNavigate: (path) => navigate(path),
    onOverlayOpen: (type, payload) => {
      // Handle opening overlays (booking, cart, contact, etc.)
      setPipelineOverlayOpen(true);
      setPipelineConfig({ type, payload });
    },
  });
  
  // Attach when iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    iframe.onload = () => {
      attachToIframe(iframe);
    };
    
    return () => detach();
  }, []);
  
  // Before publishing, annotate all buttons
  const handlePublish = async () => {
    await annotateAll();
    const html = getAnnotatedHTML();
    // Save annotated HTML...
  };
}
```

## HTML Attributes

### Button Annotations

```html
<!-- Explicit intent (set by AI or resolver) -->
<button data-ut-intent="booking.open">Book Now</button>

<!-- With payload -->
<button 
  data-ut-intent="shop.add_to_cart"
  data-ut-payload='{"productId":"abc123","quantity":1}'
>
  Add to Cart
</button>

<!-- Navigation with path -->
<a 
  href="/services" 
  data-ut-intent="nav.goto_page"
  data-ut-path="/services"
>
  Our Services
</a>

<!-- Skip intent handling -->
<button data-no-intent>Custom JS Handler</button>
<a data-ut-intent="none">Plain Link</a>
```

## AI Prompt Guidelines

When generating HTML, the AI should:

1. **Always add `data-ut-intent`** to interactive elements
2. **Use canonical intent names** from the Action Catalog
3. **Include payloads** where needed

Example AI prompt section:

```
IMPORTANT - INTENT WIRING:
- Every button/link MUST have data-ut-intent attribute
- Use these intents: nav.goto_page, shop.add_to_cart, booking.open, lead.open_form, call.now, auth.sign_in, etc.
- Navigation links: data-ut-intent="nav.goto_page" data-ut-path="/pagename"
- CTA buttons: data-ut-intent="booking.open" or "lead.open_form"
```

## Production Deployment

When deploying a generated site:

1. **Pre-annotate all buttons** during build
2. **Embed annotated HTML** - intents are baked in
3. **Include production router** - deterministic execution only

```javascript
// Minimal production script (embed in deployed HTML)
<script>
(function() {
  const HANDLERS = {
    'nav.goto_page': (p) => window.location.href = p.path,
    'shop.add_to_cart': (p) => addToCart(p.productId),
    'booking.open': () => openBookingModal(),
    // ... all handlers
  };
  
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-ut-intent]');
    if (!el) return;
    
    e.preventDefault();
    const intent = el.dataset.utIntent;
    const payload = JSON.parse(el.dataset.utPayload || '{}');
    
    if (HANDLERS[intent]) HANDLERS[intent](payload);
  });
})();
</script>
```

## Best Practices

1. **Always use the hook** in React components - handles lifecycle
2. **Pre-annotate at build** - reduces runtime resolution
3. **Test with debug mode** - see what intents are resolving
4. **Custom handlers** - override defaults for your app's needs
5. **Keep Action Catalog lean** - ~20 core intents cover most cases
