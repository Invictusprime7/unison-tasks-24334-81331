/**
 * Intent Dialect Normalizer — Edge-side enforcement.
 *
 * Rewrites legacy `data-ut-intent="..."` values emitted by the AI into
 * their canonical CoreIntent names BEFORE the patch is committed.
 *
 * Mirrors src/runtime/intentAliases.ts. Keep the two maps in sync.
 *
 * Policy:
 *  - Canonical intent names listed in CANONICAL_INTENTS pass through.
 *  - Anything in LEGACY_TO_CANONICAL is rewritten + warned (severity: "info").
 *  - Unknown intents are flagged (severity: "warning") but not rejected —
 *    the runtime resolver will still attempt domain-fallback handling.
 */

const CANONICAL_INTENTS = new Set<string>([
  // navigation
  'nav.goto', 'nav.anchor', 'nav.external', 'nav.back',
  // commerce / payments
  'pay.checkout', 'pay.success', 'pay.cancel',
  'cart.add', 'cart.view', 'cart.checkout', 'cart.remove',
  // booking
  'booking.create',
  // lead capture
  'contact.submit', 'quote.request', 'lead.capture', 'newsletter.subscribe',
  // auth
  'auth.login', 'auth.register', 'auth.logout',
  // generic
  'button.click', 'form.submit',
]);

const LEGACY_TO_CANONICAL: Record<string, string> = {
  // navigation
  'nav.goto_page': 'nav.goto',
  'nav.to': 'nav.goto',
  'nav.navigate': 'nav.goto',
  'nav.page': 'nav.goto',
  'nav.internal': 'nav.goto',
  'nav.route': 'nav.goto',
  'nav.open': 'nav.goto',
  'nav.scroll': 'nav.anchor',
  'nav.scroll_to': 'nav.anchor',
  'nav.external_link': 'nav.external',
  'nav.open_external': 'nav.external',
  // payments / cart
  'shop.checkout': 'pay.checkout',
  'shop.add_to_cart': 'cart.add',
  'shop.open_cart': 'cart.view',
  'shop.remove_from_cart': 'cart.remove',
  'shop.view_product': 'cart.add',
  'checkout.start': 'pay.checkout',
  'checkout.begin': 'pay.checkout',
  'checkout.open': 'cart.checkout',
  'payment.start': 'pay.checkout',
  'payment.checkout': 'pay.checkout',
  'stripe.checkout': 'pay.checkout',
  'pay.start': 'pay.checkout',
  'cart.add_item': 'cart.add',
  'product.add_to_cart': 'cart.add',
  'cart.open': 'cart.view',
  // contact / lead
  'lead.submit': 'contact.submit',
  'lead.submit_form': 'contact.submit',
  'lead.open_form': 'contact.submit',
  'contact.send': 'contact.submit',
  'contact.form': 'contact.submit',
  // newsletter
  'newsletter.submit': 'newsletter.subscribe',
  'newsletter.signup': 'newsletter.subscribe',
  'waitlist.join': 'newsletter.subscribe',
  // booking
  'booking.open': 'booking.create',
  'booking.start': 'booking.create',
  'booking.submit': 'booking.create',
  'calendar.open': 'booking.create',
  'calendar.book': 'booking.create',
  'appointment.book': 'booking.create',
  // quote
  'quote.open': 'quote.request',
  'quote.submit': 'quote.request',
  'estimate.request': 'quote.request',
  // auth
  'auth.sign_in': 'auth.login',
  'auth.signin': 'auth.login',
  'auth.sign_up': 'auth.register',
  'auth.signup': 'auth.register',
  'auth.sign_out': 'auth.logout',
};

const INTENT_ATTR_RE = /data-ut-intent\s*=\s*(["'])([^"']+)\1/g;

export interface DialectNormalizationResult {
  cleanedFiles: Record<string, string>;
  warnings: Array<{ severity: 'info' | 'warning' | 'error'; message: string }>;
  rewriteCount: number;
  unknownIntents: string[];
}

/**
 * Scan every file in the patch, rewrite legacy intent names to canonical,
 * and surface drift warnings.
 */
export function normalizeIntentDialect(
  files: Record<string, string>,
): DialectNormalizationResult {
  const cleanedFiles: Record<string, string> = {};
  const warnings: DialectNormalizationResult['warnings'] = [];
  const unknownIntents = new Set<string>();
  let rewriteCount = 0;

  for (const [path, content] of Object.entries(files)) {
    if (!/\.(tsx|jsx|ts|js|html)$/.test(path)) {
      cleanedFiles[path] = content;
      continue;
    }

    let touched = false;
    const next = content.replace(INTENT_ATTR_RE, (full, quote, raw) => {
      const intent = String(raw).trim();
      if (CANONICAL_INTENTS.has(intent)) return full;

      const canonical = LEGACY_TO_CANONICAL[intent] ?? LEGACY_TO_CANONICAL[intent.toLowerCase()];
      if (canonical) {
        rewriteCount += 1;
        touched = true;
        warnings.push({
          severity: 'info',
          message: `Intent dialect normalized in ${path}: "${intent}" → "${canonical}"`,
        });
        return `data-ut-intent=${quote}${canonical}${quote}`;
      }

      unknownIntents.add(intent);
      return full;
    });

    cleanedFiles[path] = touched ? next : content;
  }

  if (unknownIntents.size > 0) {
    warnings.push({
      severity: 'warning',
      message:
        `Unknown intent dialect tokens — runtime will domain-fallback but please use canonical names: ` +
        Array.from(unknownIntents).slice(0, 8).join(', '),
    });
  }

  return {
    cleanedFiles,
    warnings,
    rewriteCount,
    unknownIntents: Array.from(unknownIntents),
  };
}
