/**
 * Layout Templates - Utility Functions
 * Shared helpers for template generation
 */

/**
 * Wraps body content into a full HTML document with Tailwind CSS CDN
 */
export const wrapInHtmlDoc = (body: string, title: string = "AI Web Builder Template") => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html { scroll-behavior: smooth; }
    @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
    details > summary { list-style: none; cursor: pointer; }
    details > summary::-webkit-details-marker { display: none; }
    .tw-focus:focus-visible { outline: 2px solid rgba(56, 189, 248, 0.8); outline-offset: 3px; }
  </style>
</head>
<body class="bg-slate-950 text-white">
  ${body}

  <script>
    (() => {
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const stickyStoragePrefix = 'stickyDismissed:';

      // Smooth-scroll for in-page anchors.
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest('a[href^="#"]');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        if (href.length < 2) return;
        const el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });

      // data-toggle="#targetId" toggles the target's "hidden" class.
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const btn = target.closest('[data-toggle]');
        if (!btn) return;

        const selector = btn.getAttribute('data-toggle');
        if (!selector) return;
        const panel = document.querySelector(selector);
        if (!(panel instanceof HTMLElement)) return;

        panel.classList.toggle('hidden');
        panel.setAttribute('aria-hidden', panel.classList.contains('hidden') ? 'true' : 'false');
      });

      // Sticky dismiss: [data-sticky][data-sticky-key] can be hidden via a [data-dismiss] button.
      const hideSticky = (stickyEl, key) => {
        if (!(stickyEl instanceof HTMLElement)) return;
        stickyEl.classList.add('hidden');
        stickyEl.setAttribute('aria-hidden', 'true');
        if (key) {
          try {
            localStorage.setItem(stickyStoragePrefix + key, '1');
          } catch {
            // ignore storage errors
          }
        }
      };

      document.querySelectorAll('[data-sticky-key]').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const key = el.getAttribute('data-sticky-key');
        if (!key) return;
        try {
          const dismissed = localStorage.getItem(stickyStoragePrefix + key) === '1';
          if (dismissed) hideSticky(el, undefined);
        } catch {
          // ignore storage errors
        }
      });

      // Use capture phase so this still works even if the builder/preview intercepts clicks.
      document.addEventListener(
        'click',
        (e) => {
          const target = e.target;
          if (!(target instanceof Element)) return;
          const btn = target.closest('[data-dismiss]');
          if (!btn) return;

          const selector = btn.getAttribute('data-dismiss') || '';
          const key = btn.getAttribute('data-dismiss-key') || undefined;
          const sticky =
            selector && selector !== 'closest'
              ? document.querySelector(selector)
              : btn.closest('[data-sticky]') || btn.closest('[data-sticky-key]');
          if (!sticky) return;

          // Prevent preview navigation overlays / generic button interception.
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

          hideSticky(sticky, key);
        },
        true
      );

      // Tabs: [data-tabs] contains buttons [data-tab] and panels [data-tab-panel].
      document.querySelectorAll('[data-tabs]').forEach((root) => {
        if (!(root instanceof HTMLElement)) return;
        const buttons = Array.from(root.querySelectorAll('[data-tab]'));
        const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
        if (buttons.length === 0 || panels.length === 0) return;

        const theme = (root.getAttribute('data-tabs-theme') || 'dark').toLowerCase();

        const applyButtonStyles = (button, isActive) => {
          if (!(button instanceof HTMLElement)) return;

          if (theme === 'light') {
            // Light: active = dark pill, inactive = white pill.
            button.classList.toggle('bg-neutral-900', isActive);
            button.classList.toggle('text-white', isActive);
            button.classList.toggle('bg-white', !isActive);
            button.classList.toggle('text-neutral-900', !isActive);
            button.classList.remove('bg-white/10', 'bg-white/5', 'text-slate-400', 'text-slate-300');
            return;
          }

          // Dark: active = stronger glass, inactive = softer.
          button.classList.toggle('bg-white/10', isActive);
          button.classList.toggle('text-white', isActive);
          button.classList.toggle('bg-white/5', !isActive);
          button.classList.toggle('text-slate-300', !isActive);
          button.classList.remove('bg-neutral-900', 'bg-white', 'text-neutral-900');
        };

        const activate = (key) => {
          buttons.forEach((b) => {
            const isActive = b.getAttribute('data-tab') === key;
            applyButtonStyles(b, isActive);
            b.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });
          panels.forEach((p) => {
            const isActive = p.getAttribute('data-tab-panel') === key;
            p.classList.toggle('hidden', !isActive);
          });
        };

        const initial = root.getAttribute('data-tabs') || buttons[0].getAttribute('data-tab');
        if (initial) activate(initial);

        root.addEventListener('click', (e) => {
          const t = e.target;
          if (!(t instanceof Element)) return;
          const b = t.closest('[data-tab]');
          if (!(b instanceof HTMLElement)) return;
          const key = b.getAttribute('data-tab');
          if (!key) return;
          activate(key);
        });
      });

      // Carousel: [data-carousel] contains [data-carousel-item], next/prev controls.
      document.querySelectorAll('[data-carousel]').forEach((root) => {
        if (!(root instanceof HTMLElement)) return;
        const items = Array.from(root.querySelectorAll('[data-carousel-item]')).filter((x) => x instanceof HTMLElement);
        if (items.length === 0) return;

        let index = 0;
        const show = (i) => {
          index = (i + items.length) % items.length;
          items.forEach((it, idx) => it.classList.toggle('hidden', idx !== index));
        };
        show(0);

        root.addEventListener('click', (e) => {
          const t = e.target;
          if (!(t instanceof Element)) return;
          if (t.closest('[data-carousel-prev]')) show(index - 1);
          if (t.closest('[data-carousel-next]')) show(index + 1);
        });
      });

      // Pricing switch: checkbox [data-pricing-switch] toggles elements with data-price-monthly/data-price-annual.
      document.querySelectorAll('[data-pricing]').forEach((root) => {
        if (!(root instanceof HTMLElement)) return;
        const checkbox = root.querySelector('[data-pricing-switch]');
        if (!(checkbox instanceof HTMLInputElement)) return;

        const apply = () => {
          const annual = checkbox.checked;
          root.querySelectorAll('[data-price-monthly]').forEach((el) => el.classList.toggle('hidden', annual));
          root.querySelectorAll('[data-price-annual]').forEach((el) => el.classList.toggle('hidden', !annual));
        };
        checkbox.addEventListener('change', apply);
        apply();
      });

      // "Demo" forms: add data-demo-form to show a lightweight success message without navigation.
      document.querySelectorAll('form[data-demo-form]').forEach((form) => {
        if (!(form instanceof HTMLFormElement)) return;
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const msg = form.getAttribute('data-demo-message') || 'Thanks! We\'ll be in touch shortly.';
          const host = form.closest('[data-demo-form-host]') || form;
          const existing = host.querySelector('[data-demo-toast]');
          if (existing) existing.remove();

          const toast = document.createElement('div');
          toast.setAttribute('data-demo-toast', '');
          toast.className = 'mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200';
          toast.textContent = msg;
          host.appendChild(toast);
        });
      });
    })();
  </script>
</body>
</html>`;
