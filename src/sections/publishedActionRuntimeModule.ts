/**
 * publishedActionRuntimeModule — VFS-injected client-side intent adapter.
 *
 * Deterministic navigation remains native. CTA intents that are represented by
 * a generated public form focus that form; privileged booking and commerce
 * actions remain blocked until their approved runtime adapters are installed.
 */

export const PUBLISHED_ACTION_RUNTIME_PATH = '/src/components/publishedActionRuntime.ts';

export const PUBLISHED_ACTION_RUNTIME_MODULE = `import { useEffect } from 'react';

const FORM_INTENT_TARGETS: Record<string, string[]> = {
  'contact.submit': ['contact.submit'],
  'lead.capture': ['contact.submit'],
  'quote.request': ['quote.request', 'contact.submit'],
  'newsletter.subscribe': ['newsletter.subscribe'],
};

const BLOCKED_ACTIONS = new Set([
  'booking.create',
  'booking.reschedule',
  'booking.cancel',
  'cart.add',
  'cart.view',
  'cart.checkout',
  'checkout.start',
  'pay.checkout',
]);

function focusForm(intent: string): boolean {
  const candidates = FORM_INTENT_TARGETS[intent];
  if (!candidates) return false;
  for (const candidate of candidates) {
    const form = document.querySelector(
      'form[data-demo-form="true"][data-ut-intent="' + candidate + '"]',
    ) as HTMLFormElement | null;
    if (!form) continue;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      const firstField = form.querySelector('input, textarea, select') as HTMLElement | null;
      firstField?.focus({ preventScroll: true });
    }, 250);
    return true;
  }
  return false;
}

function showActionStatus(element: HTMLElement, message: string) {
  const statusId = 'unison-action-status';
  let status = document.getElementById(statusId);
  if (!status) {
    status = document.createElement('p');
    status.id = statusId;
    status.setAttribute('role', 'status');
    status.style.position = 'fixed';
    status.style.left = '1rem';
    status.style.bottom = '1rem';
    status.style.zIndex = '9999';
    status.style.maxWidth = 'min(26rem, calc(100vw - 2rem))';
    status.style.margin = '0';
    status.style.padding = '0.75rem 1rem';
    status.style.borderRadius = '0.5rem';
    status.style.background = '#111827';
    status.style.color = '#ffffff';
    status.style.fontFamily = 'system-ui, sans-serif';
    document.body.appendChild(status);
  }
  status.textContent = message;
  element.setAttribute('aria-describedby', statusId);
}

export function usePublishedActionRuntime() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent !== window) return;

    const onClick = (event: MouseEvent) => {
      const origin = event.target as Element | null;
      const element = origin?.closest('[data-ut-intent]') as HTMLElement | null;
      if (!element) return;
      const intent = element.dataset.utIntent || '';
      if (!intent || element.closest('form[data-demo-form="true"]')) return;

      if (focusForm(intent)) {
        event.preventDefault();
        return;
      }
      if (BLOCKED_ACTIONS.has(intent)) {
        event.preventDefault();
        showActionStatus(element, 'This action is not configured for this site yet.');
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
`;