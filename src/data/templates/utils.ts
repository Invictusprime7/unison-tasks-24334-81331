/**
 * Layout Templates - Utility Functions
 * Shared helpers for template generation
 * 
 * REACT-ONLY: All templates output native React/JSX component strings (.tsx)
 * No dangerouslySetInnerHTML — uses htmlToJsx converter for HTML→JSX.
 */

import { getCompositionById } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';
import { ensureReactImports } from '@/utils/aiCodeCleaner';
import { htmlToJsx, htmlDocToReactComponentWithCSS, isHtmlDocument } from '@/utils/htmlToJsx';

/**
 * Extracts <style> block content from HTML body strings
 */
function extractStyles(body: string): { styles: string; cleanBody: string } {
  const styleBlocks: string[] = [];
  const cleanBody = body.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    styleBlocks.push(css.trim());
    return '';
  });
  return { styles: styleBlocks.join('\n\n'), cleanBody: cleanBody.trim() };
}

/**
 * Extracts <script> block content from HTML body strings
 */
function extractScripts(body: string): { scripts: string; cleanBody: string } {
  const scriptBlocks: string[] = [];
  const cleanBody = body.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => {
    scriptBlocks.push(js.trim());
    return '';
  });
  return { scripts: scriptBlocks.join('\n\n'), cleanBody: cleanBody.trim() };
}

/**
 * Wraps body content into a React component with native JSX — no dangerouslySetInnerHTML.
 * 
 * The component:
 * 1. Converts HTML to valid JSX (class→className, style strings→objects, etc.)
 * 2. Injects <style> blocks via useEffect
 * 3. Runs interactive scripts (tabs, carousel, scroll-reveal) via useEffect
 */
/**
 * Wraps body content into a React component with native JSX.
 * Returns component code + extracted CSS separately.
 * No DOM style injection — CSS is meant for a .css file import.
 */
export const wrapInReactComponentWithCSS = (body: string, title: string = "Template"): { code: string; css: string } => {
  // If it's a full HTML document, delegate to the document converter
  if (isHtmlDocument(body)) {
    return htmlDocToReactComponentWithCSS(body, 'App');
  }

  // Strip AI reasoning blocks that may leak from LLM responses
  let cleanedBody = body.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleanedBody = cleanedBody.replace(/^[\s\S]*?(?=<!DOCTYPE|<html|<header|<section|<nav|<div|<main)/i, (match) => {
    if (/\b(UNDERSTAND|ANALYSE|PLAN|CONSIDER|DECIDE|I will|I need|Let me)\b/i.test(match)) return '';
    return match;
  });
  
  // Extract styles and scripts from the body content
  const { styles: extractedStyles, cleanBody: bodyAfterStyles } = extractStyles(cleanedBody);
  const { cleanBody: finalBody } = extractScripts(bodyAfterStyles);

  const baseStyles = `html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
.tw-focus:focus-visible { outline: 2px solid rgba(56, 189, 248, 0.8); outline-offset: 3px; }`;
  
  const css = baseStyles + '\n' + extractedStyles;

  // Convert HTML body to valid JSX
  const jsxBody = htmlToJsx(finalBody);
  
  const titleJson = JSON.stringify(title);

  const code = `import React, { useEffect, useRef } from 'react';
import './template.css';

/**
 * ${title}
 * Auto-generated React component from premium template
 */

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = ${titleJson};
  }, []);

  // Run interactive scripts after JSX is mounted
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Smooth-scroll for in-page anchors
    const handleClick = (e: Event) => {
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
    };
    container.addEventListener('click', handleClick);

    // Scroll reveal with iframe-safe fallback
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 0px 0px' });
    container.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

    // Iframe-safe: force-reveal elements in viewport after 300ms
    setTimeout(() => {
      container.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < (window.innerHeight || document.documentElement.clientHeight) + 100) {
          el.classList.add('revealed');
        }
      });
    }, 300);

    // Fallback: force-reveal ALL after 2s
    const fallbackTimer = setTimeout(() => {
      container.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => {
        el.classList.add('revealed');
      });
    }, 2000);

    // Tabs
    container.querySelectorAll('[data-tabs]').forEach((root) => {
      const buttons = Array.from(root.querySelectorAll('[data-tab]'));
      const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
      if (buttons.length === 0 || panels.length === 0) return;
      const theme = (root.getAttribute('data-tabs-theme') || 'dark').toLowerCase();

      const applyButtonStyles = (button: Element, isActive: boolean) => {
        if (!(button instanceof HTMLElement)) return;
        if (theme === 'light') {
          button.classList.toggle('bg-neutral-900', isActive);
          button.classList.toggle('text-white', isActive);
          button.classList.toggle('bg-white', !isActive);
          button.classList.toggle('text-neutral-900', !isActive);
        } else {
          button.classList.toggle('bg-white/10', isActive);
          button.classList.toggle('text-white', isActive);
          button.classList.toggle('bg-white/5', !isActive);
          button.classList.toggle('text-slate-300', !isActive);
        }
      };

      const activate = (key: string) => {
        buttons.forEach(b => {
          const isActive = b.getAttribute('data-tab') === key;
          applyButtonStyles(b, isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach(p => {
          const isActive = p.getAttribute('data-tab-panel') === key;
          p.classList.toggle('hidden', !isActive);
        });
      };

      const initial = root.getAttribute('data-tabs') || buttons[0]?.getAttribute('data-tab');
      if (initial) activate(initial);

      root.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const b = t.closest('[data-tab]');
        if (!(b instanceof HTMLElement)) return;
        const key = b.getAttribute('data-tab');
        if (key) activate(key);
      });
    });

    // Carousel
    container.querySelectorAll('[data-carousel]').forEach((root) => {
      const items = Array.from(root.querySelectorAll('[data-carousel-item]')).filter(x => x instanceof HTMLElement) as HTMLElement[];
      if (items.length === 0) return;
      let index = 0;
      const show = (i: number) => {
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

    // Demo forms
    container.querySelectorAll('form[data-demo-form]').forEach(form => {
      if (!(form instanceof HTMLFormElement)) return;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = form.getAttribute('data-demo-message') || "Thanks! We'll be in touch shortly.";
        const host = form.closest('[data-demo-form-host]') || form;
        const existing = host.querySelector('[data-demo-toast]');
        if (existing) existing.remove();
        const toastEl = document.createElement('div');
        toastEl.setAttribute('data-demo-toast', '');
        toastEl.className = 'mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200';
        toastEl.textContent = msg;
        host.appendChild(toastEl);
      });
    });

    return () => {
      container.removeEventListener('click', handleClick);
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen">
      ${jsxBody}
    </div>
  );
}
`;

  return { code, css };
};

/**
 * Backward-compatible wrapper — returns just component code string.
 * CSS import (`./template.css`) is included in the component.
 */
export const wrapInReactComponent = (body: string, title: string = "Template"): string => {
  return wrapInReactComponentWithCSS(body, title).code;
};

/**
 * @deprecated Use wrapInReactComponent instead. Kept for backward compatibility during migration.
 */
export const wrapInHtmlDoc = wrapInReactComponent;

/**
 * Gets VFS-ready React code + extracted CSS for a template.
 * Returns { code, css } where css should go into /src/template.css.
 */
export const getTemplateReactCodeWithCSS = (template: { code: string; id?: string; title?: string; name?: string }): { code: string; css: string } => {
  // Check for section-registry composition first
  if (template.id) {
    const composition = getCompositionById(template.id);
    if (composition) {
      return { code: compositionToReactCode(composition), css: '' };
    }
  }

  // Strip AI reasoning blocks before any processing
  let code = template.code.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

  // If already React code, return with imports ensured
  if (code.includes('import React') || code.includes('from "react"') || code.includes("from 'react'")) {
    return { code, css: '' };
  }
  
  // Has React component but missing import — use shared utility
  if (code.includes('export default function') || code.includes('export default ')) {
    return { code: ensureReactImports(code), css: '' };
  }

  // Full HTML document → convert to native JSX component + CSS
  if (isHtmlDocument(code)) {
    return htmlDocToReactComponentWithCSS(code, 'App');
  }

  // Raw HTML fragment → wrap in React component with native JSX + CSS
  return wrapInReactComponentWithCSS(code, template.title || template.name || 'Template');
};

/**
 * Gets the VFS-ready React code for a template.
 * Backward-compatible wrapper — returns just the component code.
 */
export const getTemplateReactCode = (template: { code: string; id?: string; title?: string; name?: string }): string => {
  return getTemplateReactCodeWithCSS(template).code;
};
