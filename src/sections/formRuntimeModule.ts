/**
 * formRuntimeModule — VFS-injected public form adapter.
 *
 * Generated forms stay ordinary HTML forms. In a deployed site this module
 * captures only Unison-marked forms and submits them through the constrained
 * public form-submit Edge Function. Builder preview keeps its host behavior.
 */

import { PUBLISHED_RUNTIME_IMPORT_SPECIFIER } from '@/services/publishedRuntimeModule';

export const FORM_RUNTIME_PATH = '/src/components/formRuntime.ts';

export const FORM_RUNTIME_MODULE = `import { useEffect } from 'react';
import { PUBLISHED_RUNTIME_CONFIG } from '${PUBLISHED_RUNTIME_IMPORT_SPECIFIER}';

type PublishedRuntimeConfig = {
  siteId: string | null;
  businessId: string | null;
  projectId: string | null;
  snapshotId: string | null;
  formEndpoint: string | null;
};

const VALID_INTENTS = new Set([
  'contact.submit',
  'quote.request',
  'booking.request',
  'newsletter.subscribe',
  'application.submit',
]);

function setStatus(form: HTMLFormElement, message: string, failed = false) {
  let status = form.querySelector('[data-unison-form-status]') as HTMLElement | null;
  if (!status) {
    status = document.createElement('p');
    status.dataset.unisonFormStatus = 'true';
    status.setAttribute('role', 'status');
    status.style.margin = '0.75rem 0 0';
    status.style.fontSize = '0.9rem';
    form.appendChild(status);
  }
  status.textContent = message;
  status.style.color = failed ? '#b91c1c' : '#15803d';
}

function createIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'form-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

export function usePublishedFormRuntime() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent !== window) return;
    const runtime = PUBLISHED_RUNTIME_CONFIG;

    const onSubmit = async (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.demoForm !== 'true') return;
      event.preventDefault();
      if (!runtime.siteId || !runtime.businessId || !runtime.projectId || !runtime.formEndpoint) {
        setStatus(form, 'This form is not connected yet.', true);
        return;
      }

      const section = form.closest('[data-ut-section-id]') as HTMLElement | null;
      const requestedIntent = form.dataset.utIntent || 'contact.submit';
      const intent = VALID_INTENTS.has(requestedIntent) ? requestedIntent : 'contact.submit';
      const formId = intent;
      const formData = new FormData(form);
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (typeof value === 'string' && key.length <= 100) data[key] = value.slice(0, 5000);
      });
      const submitter = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLButtonElement | HTMLInputElement | null;
      if (submitter) submitter.disabled = true;
      form.dataset.unisonSubmitState = 'submitting';

      try {
        const response = await fetch(runtime.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: runtime.businessId,
            projectId: runtime.projectId,
            siteId: runtime.siteId,
            snapshotId: runtime.snapshotId || undefined,
            formId,
            formName: section?.dataset.utSectionType || intent,
            intent,
            pageId: window.location.pathname || '/',
            componentId: section?.dataset.utSectionId || undefined,
            sourceUrl: window.location.href,
            referrer: document.referrer || undefined,
            utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
            consentMetadata: {},
            idempotencyKey: createIdempotencyKey(),
            honeypot: '',
            data,
          }),
        });
        if (!response.ok) throw new Error('Form submission failed');
        form.reset();
        form.dataset.unisonSubmitState = 'submitted';
        setStatus(form, 'Thanks. Your submission has been received.');
      } catch {
        form.dataset.unisonSubmitState = 'error';
        setStatus(form, 'We could not send your submission. Please try again.', true);
      } finally {
        if (submitter) submitter.disabled = false;
      }
    };

    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);
}
`;