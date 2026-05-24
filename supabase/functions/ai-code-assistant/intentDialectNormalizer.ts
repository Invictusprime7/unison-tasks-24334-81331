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
  'cart.add', 'cart.view', 'cart.checkout', 'cart.remove', 'cart.abandoned',
  'product.view',
  'order.created', 'order.shipped', 'order.delivered',
  // booking
  'booking.create', 'booking.confirmed', 'booking.reminder', 'booking.cancelled', 'booking.noshow',
  // lead capture / CRM
  'contact.submit', 'contact.call', 'contact.email',
  'quote.request', 'lead.capture', 'newsletter.subscribe',
  'deal.won', 'deal.lost', 'proposal.sent', 'job.completed',
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
  'nav.link': 'nav.goto',
  'nav.scroll': 'nav.anchor',
  'nav.scroll_to': 'nav.anchor',
  'nav.jump': 'nav.anchor',
  'nav.section': 'nav.anchor',
  'nav.external_link': 'nav.external',
  'nav.open_external': 'nav.external',
  'nav.new_tab': 'nav.external',
  'nav.previous': 'nav.back',
  'nav.go_back': 'nav.back',
  // payments / cart
  'shop.checkout': 'pay.checkout',
  'shop.add_to_cart': 'cart.add',
  'shop.open_cart': 'cart.view',
  'shop.remove_from_cart': 'cart.remove',
  'shop.view_product': 'product.view',
  'shop.buy': 'pay.checkout',
  'shop.purchase': 'pay.checkout',
  'checkout.start': 'pay.checkout',
  'checkout.begin': 'pay.checkout',
  'checkout.open': 'cart.checkout',
  'checkout.proceed': 'cart.checkout',
  'payment.start': 'pay.checkout',
  'payment.checkout': 'pay.checkout',
  'payment.subscribe': 'pay.checkout',
  'subscribe.start': 'pay.checkout',
  'subscribe.plan': 'pay.checkout',
  'plan.select': 'pay.checkout',
  'stripe.checkout': 'pay.checkout',
  'pay.start': 'pay.checkout',
  'pay.now': 'pay.checkout',
  'cart.add_item': 'cart.add',
  'cart.add_to': 'cart.add',
  'product.add_to_cart': 'cart.add',
  'product.add': 'cart.add',
  'product.open': 'product.view',
  'product.details': 'product.view',
  'cart.open': 'cart.view',
  'cart.show': 'cart.view',
  'cart.drawer': 'cart.view',
  // contact / lead
  'lead.submit': 'contact.submit',
  'lead.submit_form': 'contact.submit',
  'lead.open_form': 'contact.submit',
  'lead.create': 'lead.capture',
  'lead.new': 'lead.capture',
  'contact.send': 'contact.submit',
  'contact.form': 'contact.submit',
  'contact.message': 'contact.submit',
  'contact.phone': 'contact.call',
  'contact.tel': 'contact.call',
  'contact.mail': 'contact.email',
  // newsletter
  'newsletter.submit': 'newsletter.subscribe',
  'newsletter.signup': 'newsletter.subscribe',
  'newsletter.join': 'newsletter.subscribe',
  'waitlist.join': 'newsletter.subscribe',
  'waitlist.subscribe': 'newsletter.subscribe',
  'email.subscribe': 'newsletter.subscribe',
  // booking
  'booking.open': 'booking.create',
  'booking.start': 'booking.create',
  'booking.submit': 'booking.create',
  'booking.book': 'booking.create',
  'booking.schedule': 'booking.create',
  'booking.new': 'booking.create',
  'calendar.open': 'booking.create',
  'calendar.book': 'booking.create',
  'calendar.schedule': 'booking.create',
  'appointment.book': 'booking.create',
  'appointment.schedule': 'booking.create',
  'appointment.create': 'booking.create',
  'reservation.submit': 'booking.create',
  'reservation.book': 'booking.create',
  // quote
  'quote.open': 'quote.request',
  'quote.submit': 'quote.request',
  'quote.get': 'quote.request',
  'estimate.request': 'quote.request',
  'estimate.get': 'quote.request',
  'estimate.submit': 'quote.request',
  // auth
  'auth.sign_in': 'auth.login',
  'auth.signin': 'auth.login',
  'auth.log_in': 'auth.login',
  'user.login': 'auth.login',
  'user.signin': 'auth.login',
  'auth.sign_up': 'auth.register',
  'auth.signup': 'auth.register',
  'auth.create_account': 'auth.register',
  'user.register': 'auth.register',
  'user.signup': 'auth.register',
  'account.create': 'auth.register',
  'auth.sign_out': 'auth.logout',
  'user.logout': 'auth.logout',
  'session.end': 'auth.logout',
  // order events
  'order.placed': 'order.created',
  'order.new': 'order.created',
  // CRM
  'deal.closed_won': 'deal.won',
  'deal.closed_lost': 'deal.lost',
  'proposal.send': 'proposal.sent',
  'job.done': 'job.completed',
  'job.finished': 'job.completed',
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
