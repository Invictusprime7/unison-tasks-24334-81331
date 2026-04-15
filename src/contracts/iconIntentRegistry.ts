/**
 * Icon Intent Registry — Universal mapping of interactive icons to behaviors.
 *
 * Every icon that implies user interaction is registered here with:
 *  - The canonical CoreIntent it fires
 *  - The UI behavior (inline-expand vs overlay, context-dependent)
 *  - The payload schema for runtime data
 *  - The Lucide icon name for consistent rendering
 *
 * Labels are presentation-only. Icons are identified by their `iconSlot` key
 * (e.g., "navbar.search", "navbar.cart"). This follows the same slot-bound
 * contract principle used for CTA buttons.
 *
 * RULE: Decorative icons (ChevronRight on a card, MapPin next to an address)
 * are NOT registered here. Only icons that trigger interactive behavior.
 */

import type { CoreIntent } from '@/coreIntents';

// ============================================================================
// Types
// ============================================================================

/** Where the icon is rendered — determines inline vs overlay behavior */
export type IconPlacement = 'navbar' | 'hero' | 'sidebar' | 'footer' | 'card' | 'toolbar' | 'floating';

/** How the icon's interactive UI renders */
export type IconUIBehavior = 'inline-expand' | 'overlay' | 'navigate' | 'state-toggle' | 'dropdown';

/** A registered interactive icon definition */
export interface IconIntentDefinition {
  /** Stable identity key: e.g., "search", "cart", "user" */
  iconKey: string;
  /** Lucide icon name (kebab-case for dynamic imports, PascalCase for static) */
  lucideIcon: string;
  /** Canonical intent this icon fires */
  coreIntent: CoreIntent | string;
  /** Default aria-label for accessibility */
  ariaLabel: string;
  /** Human description of behavior */
  description: string;
  /** UI behavior per placement context */
  behaviorByPlacement: Partial<Record<IconPlacement, IconUIBehavior>>;
  /** Default behavior if placement not specified */
  defaultBehavior: IconUIBehavior;
  /** Required payload keys (data-ut-* attributes) */
  payloadKeys?: string[];
  /** Whether this icon needs a badge/counter (e.g., cart count, notification count) */
  hasBadge?: boolean;
  /** Capability required for this icon to be active */
  requiredCapability?: string;
  /** The interactive component type to render */
  interactiveComponent: IconInteractiveComponent;
}

/** What interactive UI the icon opens */
export type IconInteractiveComponent =
  | 'search-field'
  | 'cart-drawer'
  | 'user-menu'
  | 'mobile-menu'
  | 'notification-panel'
  | 'filter-panel'
  | 'share-sheet'
  | 'favorites-drawer'
  | 'settings-menu'
  | 'language-picker'
  | 'theme-toggle'
  | 'accessibility-panel'
  | 'sort-dropdown'
  | 'chat-widget'
  | 'add-form'
  | 'none';

/** A resolved icon binding for a specific page/section */
export interface ResolvedIconBinding {
  /** Stable slot key: pageRole.section.iconKey */
  slotKey: string;
  iconKey: string;
  lucideIcon: string;
  coreIntent: CoreIntent | string;
  uiBehavior: IconUIBehavior;
  interactiveComponent: IconInteractiveComponent;
  ariaLabel: string;
  hasBadge: boolean;
  payloadKeys: string[];
  /** data-ut-* attributes to inject into generated markup */
  dataAttributes: Record<string, string>;
}

// ============================================================================
// Icon Registry
// ============================================================================

export const ICON_INTENT_REGISTRY: Record<string, IconIntentDefinition> = {
  // ── Search ────────────────────────────────────────────────────────────
  search: {
    iconKey: 'search',
    lucideIcon: 'Search',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Search',
    description: 'Opens a search field for site-wide content search',
    behaviorByPlacement: {
      navbar: 'inline-expand',
      hero: 'inline-expand',
      sidebar: 'inline-expand',
      toolbar: 'inline-expand',
      floating: 'overlay',
    },
    defaultBehavior: 'inline-expand',
    interactiveComponent: 'search-field',
  },

  // ── Cart ──────────────────────────────────────────────────────────────
  cart: {
    iconKey: 'cart',
    lucideIcon: 'ShoppingCart',
    coreIntent: 'cart.checkout',
    ariaLabel: 'Shopping cart',
    description: 'Opens the cart drawer/overlay showing items and checkout',
    behaviorByPlacement: {
      navbar: 'overlay',
      floating: 'overlay',
      toolbar: 'overlay',
    },
    defaultBehavior: 'overlay',
    hasBadge: true,
    requiredCapability: 'commerce',
    interactiveComponent: 'cart-drawer',
    payloadKeys: ['data-ut-cart-count'],
  },

  // ── User/Profile ─────────────────────────────────────────────────────
  user: {
    iconKey: 'user',
    lucideIcon: 'User',
    coreIntent: 'auth.login',
    ariaLabel: 'Account',
    description: 'Opens user account menu or auth modal',
    behaviorByPlacement: {
      navbar: 'dropdown',
      toolbar: 'dropdown',
      floating: 'overlay',
    },
    defaultBehavior: 'dropdown',
    interactiveComponent: 'user-menu',
  },

  // ── Menu/Hamburger ───────────────────────────────────────────────────
  menu: {
    iconKey: 'menu',
    lucideIcon: 'Menu',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Menu',
    description: 'Opens mobile navigation drawer',
    behaviorByPlacement: {
      navbar: 'overlay',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'mobile-menu',
  },

  // ── Close ─────────────────────────────────────────────────────────────
  close: {
    iconKey: 'close',
    lucideIcon: 'X',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Close',
    description: 'Closes the current panel, modal, or expanded UI',
    behaviorByPlacement: {},
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'none',
  },

  // ── Notifications/Bell ───────────────────────────────────────────────
  notifications: {
    iconKey: 'notifications',
    lucideIcon: 'Bell',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Notifications',
    description: 'Opens notification panel',
    behaviorByPlacement: {
      navbar: 'dropdown',
      toolbar: 'dropdown',
    },
    defaultBehavior: 'dropdown',
    hasBadge: true,
    interactiveComponent: 'notification-panel',
  },

  // ── Filter ────────────────────────────────────────────────────────────
  filter: {
    iconKey: 'filter',
    lucideIcon: 'Filter',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Filter',
    description: 'Opens filter panel for refining results',
    behaviorByPlacement: {
      toolbar: 'inline-expand',
      sidebar: 'inline-expand',
      card: 'dropdown',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'filter-panel',
  },

  // ── Sort ──────────────────────────────────────────────────────────────
  sort: {
    iconKey: 'sort',
    lucideIcon: 'ArrowUpDown',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Sort',
    description: 'Opens sort options dropdown',
    behaviorByPlacement: {
      toolbar: 'dropdown',
    },
    defaultBehavior: 'dropdown',
    interactiveComponent: 'sort-dropdown',
  },

  // ── Share ─────────────────────────────────────────────────────────────
  share: {
    iconKey: 'share',
    lucideIcon: 'Share2',
    coreIntent: 'nav.external',
    ariaLabel: 'Share',
    description: 'Opens share sheet with social/copy options',
    behaviorByPlacement: {
      card: 'overlay',
      toolbar: 'overlay',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'share-sheet',
  },

  // ── Favorite/Heart ────────────────────────────────────────────────────
  favorite: {
    iconKey: 'favorite',
    lucideIcon: 'Heart',
    coreIntent: 'cart.add',
    ariaLabel: 'Add to favorites',
    description: 'Toggles favorite/wishlist state or opens favorites drawer',
    behaviorByPlacement: {
      card: 'state-toggle',
      toolbar: 'overlay',
      navbar: 'overlay',
    },
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'favorites-drawer',
    requiredCapability: 'commerce',
  },

  // ── Settings/Gear ─────────────────────────────────────────────────────
  settings: {
    iconKey: 'settings',
    lucideIcon: 'Settings',
    coreIntent: 'nav.goto',
    ariaLabel: 'Settings',
    description: 'Opens settings menu or navigates to settings page',
    behaviorByPlacement: {
      navbar: 'dropdown',
      toolbar: 'dropdown',
      sidebar: 'navigate',
    },
    defaultBehavior: 'dropdown',
    interactiveComponent: 'settings-menu',
  },

  // ── Theme Toggle (Sun/Moon) ──────────────────────────────────────────
  theme: {
    iconKey: 'theme',
    lucideIcon: 'Sun',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Toggle theme',
    description: 'Toggles between light and dark mode',
    behaviorByPlacement: {},
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'theme-toggle',
  },

  // ── Language/Globe ────────────────────────────────────────────────────
  language: {
    iconKey: 'language',
    lucideIcon: 'Globe',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Language',
    description: 'Opens language/locale picker',
    behaviorByPlacement: {
      navbar: 'dropdown',
      footer: 'dropdown',
    },
    defaultBehavior: 'dropdown',
    interactiveComponent: 'language-picker',
  },

  // ── Accessibility ─────────────────────────────────────────────────────
  accessibility: {
    iconKey: 'accessibility',
    lucideIcon: 'Accessibility',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Accessibility options',
    description: 'Opens accessibility settings panel',
    behaviorByPlacement: {
      floating: 'overlay',
      footer: 'overlay',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'accessibility-panel',
  },

  // ── Chat/Message ──────────────────────────────────────────────────────
  chat: {
    iconKey: 'chat',
    lucideIcon: 'MessageCircle',
    coreIntent: 'contact.submit',
    ariaLabel: 'Chat',
    description: 'Opens live chat widget or contact form',
    behaviorByPlacement: {
      floating: 'overlay',
      navbar: 'overlay',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'chat-widget',
  },

  // ── Add/Plus ──────────────────────────────────────────────────────────
  add: {
    iconKey: 'add',
    lucideIcon: 'Plus',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Add',
    description: 'Opens form or triggers add action',
    behaviorByPlacement: {
      toolbar: 'overlay',
      floating: 'overlay',
      card: 'state-toggle',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'add-form',
  },

  // ── Refresh ───────────────────────────────────────────────────────────
  refresh: {
    iconKey: 'refresh',
    lucideIcon: 'RefreshCw',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Refresh',
    description: 'Refreshes current content',
    behaviorByPlacement: {},
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'none',
  },

  // ── Download ──────────────────────────────────────────────────────────
  download: {
    iconKey: 'download',
    lucideIcon: 'Download',
    coreIntent: 'nav.external',
    ariaLabel: 'Download',
    description: 'Triggers file download',
    behaviorByPlacement: {},
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'none',
  },

  // ── Copy/Clipboard ────────────────────────────────────────────────────
  copy: {
    iconKey: 'copy',
    lucideIcon: 'Copy',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Copy to clipboard',
    description: 'Copies content to clipboard with confirmation toast',
    behaviorByPlacement: {},
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'none',
  },

  // ── Edit/Pencil ───────────────────────────────────────────────────────
  edit: {
    iconKey: 'edit',
    lucideIcon: 'Pencil',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Edit',
    description: 'Opens edit mode or form for the current item',
    behaviorByPlacement: {
      card: 'overlay',
      toolbar: 'overlay',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'add-form',
  },

  // ── Delete/Trash ──────────────────────────────────────────────────────
  delete: {
    iconKey: 'delete',
    lucideIcon: 'Trash2',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Delete',
    description: 'Triggers delete confirmation',
    behaviorByPlacement: {},
    defaultBehavior: 'overlay',
    interactiveComponent: 'none',
  },

  // ── Bookmark ──────────────────────────────────────────────────────────
  bookmark: {
    iconKey: 'bookmark',
    lucideIcon: 'Bookmark',
    coreIntent: 'nav.anchor',
    ariaLabel: 'Bookmark',
    description: 'Toggles bookmark/save state',
    behaviorByPlacement: {
      card: 'state-toggle',
    },
    defaultBehavior: 'state-toggle',
    interactiveComponent: 'none',
  },

  // ── Map/Location ──────────────────────────────────────────────────────
  map: {
    iconKey: 'map',
    lucideIcon: 'MapPin',
    coreIntent: 'nav.external',
    ariaLabel: 'View on map',
    description: 'Opens map view or links to external map',
    behaviorByPlacement: {
      card: 'overlay',
      footer: 'navigate',
    },
    defaultBehavior: 'overlay',
    interactiveComponent: 'none',
  },

  // ── Phone/Call ─────────────────────────────────────────────────────────
  phone: {
    iconKey: 'phone',
    lucideIcon: 'Phone',
    coreIntent: 'nav.external',
    ariaLabel: 'Call',
    description: 'Initiates phone call via tel: link',
    behaviorByPlacement: {},
    defaultBehavior: 'navigate',
    interactiveComponent: 'none',
  },

  // ── Email/Mail ─────────────────────────────────────────────────────────
  email: {
    iconKey: 'email',
    lucideIcon: 'Mail',
    coreIntent: 'contact.submit',
    ariaLabel: 'Email',
    description: 'Opens email client or contact form',
    behaviorByPlacement: {
      navbar: 'overlay',
      footer: 'navigate',
      card: 'overlay',
    },
    defaultBehavior: 'navigate',
    interactiveComponent: 'none',
  },

  // ── Calendar ──────────────────────────────────────────────────────────
  calendar: {
    iconKey: 'calendar',
    lucideIcon: 'Calendar',
    coreIntent: 'booking.create',
    ariaLabel: 'Book appointment',
    description: 'Opens booking calendar or navigates to booking page',
    behaviorByPlacement: {
      navbar: 'overlay',
      card: 'overlay',
      hero: 'navigate',
    },
    defaultBehavior: 'overlay',
    requiredCapability: 'booking',
    interactiveComponent: 'none',
  },
};

// ============================================================================
// Resolution
// ============================================================================

/**
 * Get an icon definition by its key.
 */
export function getIconDefinition(iconKey: string): IconIntentDefinition | undefined {
  return ICON_INTENT_REGISTRY[iconKey];
}

/**
 * Resolve an icon's UI behavior for a given placement context.
 */
export function resolveIconBehavior(
  iconKey: string,
  placement: IconPlacement,
): IconUIBehavior {
  const def = ICON_INTENT_REGISTRY[iconKey];
  if (!def) return 'state-toggle';
  return def.behaviorByPlacement[placement] ?? def.defaultBehavior;
}

/**
 * Resolve a full icon binding for a page section.
 * Returns the complete data needed to render and wire the icon.
 */
export function resolveIconBinding(
  pageRole: string,
  section: string,
  iconKey: string,
  placement: IconPlacement = 'navbar',
): ResolvedIconBinding | null {
  const def = ICON_INTENT_REGISTRY[iconKey];
  if (!def) return null;

  const behavior = resolveIconBehavior(iconKey, placement);
  const slotKey = `${pageRole}.${section}.icon-${iconKey}`;

  return {
    slotKey,
    iconKey: def.iconKey,
    lucideIcon: def.lucideIcon,
    coreIntent: def.coreIntent,
    uiBehavior: behavior,
    interactiveComponent: def.interactiveComponent,
    ariaLabel: def.ariaLabel,
    hasBadge: def.hasBadge ?? false,
    payloadKeys: def.payloadKeys ?? [],
    dataAttributes: {
      'data-ut-intent': typeof def.coreIntent === 'string' ? def.coreIntent : '',
      'data-ut-element-key': slotKey,
      'data-ut-icon': def.iconKey,
      'data-ut-interactive': def.interactiveComponent,
      'data-ut-ui-behavior': behavior,
    },
  };
}

/**
 * Get all interactive icons appropriate for a section type.
 * Filters by capability requirements when capabilities are provided.
 */
export function getIconsForSection(
  section: string,
  capabilities?: string[],
): IconIntentDefinition[] {
  const capSet = capabilities ? new Set(capabilities) : null;
  const sectionPlacement = sectionToPlacement(section);

  return Object.values(ICON_INTENT_REGISTRY).filter(def => {
    // Skip if requires capability not present
    if (def.requiredCapability && capSet && !capSet.has(def.requiredCapability)) {
      return false;
    }
    // Include if has explicit behavior for this placement
    if (def.behaviorByPlacement[sectionPlacement]) return true;
    // Also include universal icons (search, theme, etc.)
    return ['search', 'theme', 'user', 'menu'].includes(def.iconKey);
  });
}

/**
 * Map section type to icon placement context.
 */
function sectionToPlacement(section: string): IconPlacement {
  switch (section) {
    case 'navbar': return 'navbar';
    case 'hero': return 'hero';
    case 'footer': return 'footer';
    case 'sidebar': return 'sidebar';
    case 'shop-grid':
    case 'product-detail':
    case 'services':
    case 'pricing':
    case 'gallery':
    case 'testimonials':
    case 'team':
    case 'blog':
      return 'card';
    default: return 'toolbar';
  }
}

/**
 * Resolve icon key from a Lucide icon name.
 * Useful for reverse-lookup when AI generates icons by Lucide name.
 */
export function resolveIconKeyFromLucide(lucideIconName: string): string | undefined {
  const normalized = lucideIconName.replace(/Icon$/, '');
  for (const [key, def] of Object.entries(ICON_INTENT_REGISTRY)) {
    if (def.lucideIcon === normalized || def.lucideIcon.toLowerCase() === normalized.toLowerCase()) {
      return key;
    }
  }
  return undefined;
}

/**
 * Generate the data-ut-* attributes string for an icon element.
 * Used by AI generation to inject correct attributes into JSX.
 */
export function generateIconDataAttributes(
  pageRole: string,
  section: string,
  iconKey: string,
): Record<string, string> {
  const binding = resolveIconBinding(pageRole, section, iconKey);
  if (!binding) return {};
  return binding.dataAttributes;
}
