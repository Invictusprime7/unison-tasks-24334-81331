/**
 * SimplePreview - Direct HTML Preview Component
 * 
 * A simple, reliable preview that renders HTML/JSX directly in an iframe.
 * No complex VFS, Docker, or file system - just takes code and renders it.
 * 
 * Supports optional element selection mode for the web builder's Edit toggle.
 */

import React, { useMemo, useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FileCode, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSelectedElementData, highlightElement, removeHighlight } from '@/utils/htmlElementSelector';

export interface SimplePreviewHandle {
  getIframe: () => HTMLIFrameElement | null;
  deleteElement: (selector: string) => boolean;
  duplicateElement: (selector: string) => boolean;
  updateElement: (selector: string, updates: any) => boolean;
}

export interface SimplePreviewProps {
  /** The code to preview - can be HTML, JSX, or React code */
  code: string;
  /** Additional CSS classes */
  className?: string;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Device breakpoint for responsive preview */
  device?: 'desktop' | 'tablet' | 'mobile';
  /** Enable element selection (for Edit mode) */
  enableSelection?: boolean;
  /** Callback when an element is selected */
  onElementSelect?: (elementData: any) => void;
}

/**
 * Detect if code is vanilla HTML (not React/JSX)
 */
function isVanillaHtml(code: string): boolean {
  const trimmed = code.trim();
  
  // Complete HTML document
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return true;
  }
  
  // Has <script> tags with vanilla JS (not JSX) - AI generates this format
  if (code.includes('<script>') || code.includes('<script ')) {
    // If it has script tags but NO React imports/JSX patterns, it's vanilla
    const hasReactImport = code.includes('import React') || code.includes("from 'react'") || code.includes('from "react"');
    const hasJsxSyntax = code.includes('className={') || code.includes('onClick={') || code.includes('useState(');
    if (!hasReactImport && !hasJsxSyntax) {
      return true;
    }
  }
  
  // Starts with HTML element and doesn't have React patterns
  if (trimmed.startsWith('<') && !trimmed.startsWith('<>')) {
    const hasReactPatterns = 
      code.includes('import React') ||
      code.includes('export default function') ||
      code.includes('export default const') ||
      code.includes('className={') ||
      (code.includes('useState') && code.includes('import'));
    
    if (!hasReactPatterns) {
      return true;
    }
  }
  
  return false;
}

/**
 * Convert any code (HTML, JSX, React) to a renderable HTML document
 */
function codeToHtml(code: string): string {
  if (!code || code.trim().length === 0) {
    return getEmptyStateHtml();
  }
  
  const trimmedCode = code.trim();
  
  // Case 1: Already a complete HTML document - inject intent listener before </body>
  if (trimmedCode.startsWith('<!DOCTYPE') || trimmedCode.startsWith('<html')) {
    console.log('[SimplePreview] Code is complete HTML document - injecting intent listener');
    return injectIntentListener(code);
  }
  
  // Case 2: Vanilla HTML/JS (AI-generated format) - wrap without JSX conversion
  if (isVanillaHtml(code)) {
    console.log('[SimplePreview] Code is vanilla HTML/JS - wrapping directly');
    return wrapHtmlSnippet(code);
  }
  
  // Case 3: React/JSX code that needs conversion
  const isReactCode = 
    code.includes('import React') ||
    code.includes('export default') ||
    (code.includes('function ') && code.includes('return (') && code.includes('className=')) ||
    (code.includes('const ') && code.includes('=> (') && code.includes('className='));
  
  if (isReactCode) {
    console.log('[SimplePreview] Converting React/JSX to HTML');
    return jsxToHtml(code);
  }
  
  // Case 4: Plain HTML snippet - wrap it
  console.log('[SimplePreview] Wrapping HTML snippet');
  return wrapHtmlSnippet(code);
}

/**
 * Inject intent listener script into existing HTML document
 */
function injectIntentListener(html: string): string {
  // Failsafe: force-reveal any animate-on-scroll elements that stay invisible
  const animationFailsafe = `
  <style>
    /* Failsafe: auto-reveal animated sections after 1.5s even if IntersectionObserver fails */
    @keyframes forceReveal {
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-on-scroll:not(.animate-visible) {
      animation: forceReveal 0.6s ease-out 1.5s forwards;
    }
    .animate-fadeIn, [class*="animate-fade"], [class*="animate-slide"] {
      animation-fill-mode: forwards;
    }
  </style>
  <script>
    // Force-reveal all hidden animated elements after DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        document.querySelectorAll('.animate-on-scroll:not(.animate-visible)').forEach(function(el) {
          el.classList.add('animate-visible');
        });
        // Also catch elements with opacity:0 inline styles from animation delays
        document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]').forEach(function(el) {
          if (el.classList.contains('animate-on-scroll') || el.style.opacity === '0') {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }
        });
      }, 2000);
    });
  </script>`;

  const intentListenerScript = `
  <script>
  (function(){
    const LABEL_INTENTS = {
      // AUTH
      'sign in':'auth.signin','log in':'auth.signin','login':'auth.signin','member login':'auth.signin',
      'sign up':'auth.signup','register':'auth.signup','get started':'auth.signup','create account':'auth.signup',
      'join now':'auth.signup','sign up free':'auth.signup','start now':'auth.signup','join free':'auth.signup',
      // TRIALS & DEMOS
      'start free trial':'trial.start','free trial':'trial.start','try free':'trial.start','try it free':'trial.start',
      'watch demo':'demo.request','request demo':'demo.request','book demo':'demo.request','schedule demo':'demo.request',
      // NEWSLETTER & WAITLIST
      'subscribe':'newsletter.subscribe','get updates':'newsletter.subscribe','join newsletter':'newsletter.subscribe',
      'join waitlist':'join.waitlist','join the waitlist':'join.waitlist','get early access':'join.waitlist',
      // CONTACT
      'contact':'contact.submit','contact us':'contact.submit','get in touch':'contact.submit','send message':'contact.submit',
      'reach out':'contact.submit','talk to us':'contact.submit',"let's talk":'contact.submit',
      'contact sales':'sales.contact','talk to sales':'sales.contact',
      // E-COMMERCE
      'add to cart':'cart.add','add to bag':'cart.add','buy now':'checkout.start','purchase':'checkout.start',
      'shop now':'shop.browse','checkout':'checkout.start','view cart':'cart.view',
      // BOOKING
      'book now':'booking.create','reserve':'booking.create','reserve table':'booking.create','book appointment':'booking.create',
      'make reservation':'booking.create','schedule now':'booking.create','book a table':'booking.create',
      'book a call':'calendar.book','schedule call':'calendar.book','book consultation':'consultation.book',
      // QUOTES
      'get quote':'quote.request','get free quote':'quote.request','request quote':'quote.request','free estimate':'quote.request',
      // PORTFOLIO
      'hire me':'project.inquire','work with me':'project.inquire','start a project':'project.start',
      'view work':'portfolio.view','view portfolio':'portfolio.view',
      // RESTAURANT
      'order online':'order.online','order now':'order.online','view menu':'menu.view','call now':'call.now',
      'order pickup':'order.pickup','order delivery':'order.delivery'
    };
    
    function inferIntent(t){
      if(!t)return null;
      const l=t.toLowerCase().trim().replace(/[^a-z0-9\\s]/g,'');
      if(LABEL_INTENTS[l])return LABEL_INTENTS[l];
      for(const[k,v]of Object.entries(LABEL_INTENTS)){
        const ck=k.replace(/[^a-z0-9\\s]/g,'');
        if(l.includes(ck)||ck.includes(l))return v;
      }
      return null;
    }

    function shouldInferIntentFromElement(el){
      // Explicit wiring always wins; inference is only for true CTAs.
      if(el.getAttribute('data-ut-intent')||el.getAttribute('data-intent'))return false;
      if(el.hasAttribute('data-no-intent'))return false;
      if(el.hasAttribute('data-ut-cta'))return true;
      const tag=(el.tagName||'').toLowerCase();
      if(tag==='a')return true;
      if(tag==='button'){
        const type=(el.getAttribute('type')||'').toLowerCase();
        if(type==='submit')return true;
      }
      return false;
    }
    
     function collectPayload(el){
      const p={};
      Array.from(el.attributes).forEach(a=>{
         if(a.name.startsWith('data-')&&a.name!=='data-intent'&&a.name!=='data-ut-intent'){
          const k=a.name.replace('data-','').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
          try{p[k]=JSON.parse(a.value)}catch{p[k]=a.value}
        }
      });
      const f=el.closest('form');
      if(f)new FormData(f).forEach((v,k)=>{if(typeof v==='string')p[k]=v});
      return p;
    }

    function normalizeText(t){
      return (t||'').replace(/\\s+/g,' ').trim();
    }

    function shouldOpenResearch(el){
      // Context-intelligent research overlay:
      // - intercept real links with meaningful text
      // - avoid anchors/mailto/tel/javascript
      // - allow opt-out via data-intent=ignore/none
      try{
        const tag = (el.tagName||'').toLowerCase();
        const href = tag==='a' ? (el.getAttribute('href')||'') : '';
        const txt = normalizeText(el.textContent || el.getAttribute('aria-label') || '');
        if(!href) return false;
        if(!txt || txt.length < 12) return false;
        if(href.startsWith('#')) return false;
        if(href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
        return true;
      }catch{return false;}
    }

    function postResearch(el){
      const href = el.getAttribute('href') || '';
      const query = normalizeText(el.textContent || el.getAttribute('aria-label') || href);
      const payload = {
        query,
        href,
        // extra context (helpful but optional)
        pageTitle: document.title,
        selection: query,
      };
      window.parent.postMessage({ type: 'RESEARCH_OPEN', payload }, '*');
    }

    // Navigation intent detection
    function detectNavIntent(el){
      const ia = el.getAttribute('data-ut-intent') || el.getAttribute('data-intent');
      
      // Explicit nav intent with payload attributes
      if(ia === 'nav.goto'){
        const path = el.getAttribute('data-ut-path') || el.getAttribute('href') || '/';
        return { intent: 'nav.goto', target: path };
      }
      if(ia === 'nav.external'){
        const url = el.getAttribute('data-ut-url') || el.getAttribute('href') || '';
        return { intent: 'nav.external', target: url };
      }
      if(ia === 'nav.anchor'){
        const anchor = el.getAttribute('data-ut-anchor') || el.getAttribute('href') || '';
        return { intent: 'nav.anchor', target: anchor };
      }
      
      // Infer from data attributes
      if(el.hasAttribute('data-ut-path')){
        return { intent: 'nav.goto', target: el.getAttribute('data-ut-path') };
      }
      if(el.hasAttribute('data-ut-url')){
        return { intent: 'nav.external', target: el.getAttribute('data-ut-url') };
      }
      if(el.hasAttribute('data-ut-anchor')){
        return { intent: 'nav.anchor', target: el.getAttribute('data-ut-anchor') };
      }
      
      return null;
    }

    // Store for dynamically generated pages
    const dynamicPageCache = {};
    let isLoadingPage = false;

    function executeNavIntent(intent, target){
      console.log('[Intent] Navigation:', intent, target);
      
      // Handle anchor links (scroll within page)
      if(intent === 'nav.anchor' || (target && target.startsWith('#'))){
        const anchor = target.replace('#', '');
        const targetEl = document.getElementById(anchor) || document.querySelector('[name="' + anchor + '"]');
        if(targetEl){
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      
      // Handle external links
      if(intent === 'nav.external' || (target && (target.startsWith('http://') || target.startsWith('https://')))){
        window.parent.postMessage({
          type: 'NAV_EXTERNAL',
          intent: intent,
          target: target
        }, '*');
        return;
      }
      
      // Handle internal page navigation - request dynamic page generation
      if(intent === 'nav.goto' || target){
        // Extract page name from path (e.g., "/checkout.html" -> "checkout")
        const pagePath = target || '';
        const pageName = pagePath.replace(/^\\//, '').replace(/\\.html$/, '').replace(/\\/$/, '') || 'index';
        
        // Get nav label from clicked element
        const clickedEl = document.activeElement || document.querySelector('[data-ut-path="' + target + '"]');
        const navLabel = clickedEl ? (clickedEl.textContent || '').trim() : pageName;
        
        // Show loading indicator
        if(isLoadingPage) return;
        isLoadingPage = true;
        
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'nav-loading-overlay';
        loadingOverlay.innerHTML = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;"><div style="background:white;padding:24px 48px;border-radius:12px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);"><div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div><div style="font-weight:600;color:#111;">Generating ' + navLabel + ' page...</div><div style="font-size:12px;color:#666;margin-top:4px;">AI is creating your custom page</div></div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
        document.body.appendChild(loadingOverlay);
        
        // Request dynamic page generation from parent
        const requestId = Date.now() + '-' + Math.random().toString(36).slice(2);
        
        // Listen for page ready response
        const handlePageReady = function(evt){
          if(!evt.data) return;
          if(evt.data.type === 'NAV_PAGE_READY' && evt.data.requestId === requestId){
            window.removeEventListener('message', handlePageReady);
            isLoadingPage = false;
            const overlay = document.getElementById('nav-loading-overlay');
            if(overlay) overlay.remove();
            
            // Replace current page content with new page
            if(evt.data.pageContent){
              document.open();
              document.write(evt.data.pageContent);
              document.close();
            }
          }
          if(evt.data.type === 'NAV_PAGE_ERROR' && evt.data.requestId === requestId){
            window.removeEventListener('message', handlePageReady);
            isLoadingPage = false;
            const overlay = document.getElementById('nav-loading-overlay');
            if(overlay) overlay.remove();
            console.error('[Intent] Page generation failed:', evt.data.error);
          }
        };
        
        window.addEventListener('message', handlePageReady);
        
        // Send page generation request
        window.parent.postMessage({
          type: 'NAV_PAGE_GENERATE',
          requestId: requestId,
          pageName: pageName,
          navLabel: navLabel,
          pageContext: intent
        }, '*');
        
        // Timeout fallback
        setTimeout(function(){
          if(isLoadingPage){
            window.removeEventListener('message', handlePageReady);
            isLoadingPage = false;
            const overlay = document.getElementById('nav-loading-overlay');
            if(overlay) overlay.remove();
            console.error('[Intent] Page generation timed out');
          }
        }, 30000);
        
        return;
      }
      
      // Fallback: send to parent
      window.parent.postMessage({
        type: 'NAV_INTENT',
        intent: intent,
        target: target
      }, '*');
    }

    // -----------------------------------------------------------------------
    // Booking UX: if a booking form/section already exists on the page,
    // scroll to it inside the preview instead of notifying the parent app.
    // This prevents the WebBuilder from opening its pipeline overlay.
    // -----------------------------------------------------------------------

    function scrollToNode(node){
      try{
        if(!node) return;
        node.scrollIntoView({ behavior: 'auto', block: 'center' });
        setTimeout(function(){
          const input = node.querySelector && node.querySelector('input:not([type="hidden"]), textarea, select');
          if(input && input.focus) input.focus();
        }, 50);
      }catch{}
    }

    function findBookingTarget(){
      console.log('[Intent] Searching for booking form...');
      
      // Priority 1: Explicitly marked forms/sections
      const explicitSelectors = [
        'form[data-ut-intent="booking.create"]',
        'form[data-intent="booking.create"]',
        'form[data-booking]',
        '[data-booking-form]',
        '#booking-form',
        '#reservation-form',
        '#appointment-form',
        '.booking-form',
        '.reservation-form',
        '.appointment-form',
      ];

      for(const sel of explicitSelectors){
        try{
          const node = document.querySelector(sel);
          if(node){
            console.log('[Intent] Found explicit booking target:', sel);
            return node;
          }
        }catch{}
      }
      
      // Priority 2: Common booking section IDs/classes
      const sectionSelectors = [
        '#booking',
        '#book',
        '#schedule',
        '#appointment',
        '#reservation',
        '#contact-form',
        '#request-form',
        'section[id*="booking"]',
        'section[id*="book"]',
        'section[id*="reserv"]',
        'section[id*="appoint"]',
        'section[id*="schedule"]',
        '[id*="booking" i]',
        '[class*="booking" i]',
        '[id*="reservation" i]',
        '[class*="reservation" i]',
        '[id*="appointment" i]',
        '[class*="appointment" i]',
      ];

      for(const sel of sectionSelectors){
        try{
          const node = document.querySelector(sel);
          if(node && node.querySelector && node.querySelector('input,select,textarea')){
            console.log('[Intent] Found section booking target:', sel);
            return node;
          }
        }catch{}
      }

      // Priority 3: Heuristic - any form with booking-like fields
      try{
        const forms = Array.from(document.querySelectorAll('form'));
        console.log('[Intent] Checking', forms.length, 'forms for booking indicators');
        
        for(const f of forms){
          const hasDate = f.querySelector('input[type="date"], input[type="datetime-local"], [name*="date" i], [id*="date" i], select[id*="date" i]');
          const hasTime = f.querySelector('input[type="time"], [name*="time" i], [id*="time" i], select[id*="time" i]');
          const hasEmail = f.querySelector('input[type="email"], [name*="email" i], [id*="email" i]');
          const hasName = f.querySelector('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]');
          const hasPhone = f.querySelector('input[type="tel"], input[name*="phone" i], input[id*="phone" i]');
          const hasService = f.querySelector('[name*="service" i], [id*="service" i], select[id*="service" i]');
          
          // Booking if: (date AND time) OR (email AND date/time) OR (name AND phone AND any other field)
          if((hasDate && hasTime) || (hasEmail && (hasDate || hasTime)) || (hasName && hasPhone) || (hasService && (hasDate || hasTime || hasName))){
            console.log('[Intent] Found heuristic booking form');
            return f;
          }
        }
      }catch(e){console.error('[Intent] Form scan error:', e);}

      // Priority 4: Last resort - find ANY form with multiple inputs
      try{
        const forms = Array.from(document.querySelectorAll('form'));
        for(const f of forms){
          const inputs = f.querySelectorAll('input:not([type="hidden"]), select, textarea');
          if(inputs.length >= 2){
            console.log('[Intent] Using fallback - first form with inputs');
            return f;
          }
        }
      }catch{}

      console.log('[Intent] No booking form found');
      return null;
    }

    function tryHandleBookingScroll(sourceEl){
      try{
        // Only for CTAs outside forms; form submit should still run the intent.
        if(sourceEl && sourceEl.closest && sourceEl.closest('form')) return false;

        // If the CTA is an anchor pointing to an on-page hash, prefer that.
        const tag = (sourceEl.tagName || '').toLowerCase();
        if(tag === 'a'){
          const href = sourceEl.getAttribute('href') || '';
          if(href && href.startsWith('#') && href.length > 1){
            const hashTarget = document.querySelector(href);
            if(hashTarget){
              scrollToNode(hashTarget);
              return true;
            }
          }
        }

        const node = findBookingTarget();
        if(node){
          scrollToNode(node);
          return true;
        }
      }catch{}
      return false;
    }

    // Allow the parent (builder) to request an in-iframe booking scroll.
    function respondCommandResult(evt, command, requestId, handled){
      try{
        const msg = { type: 'INTENT_COMMAND_RESULT', command: command, requestId: requestId, handled: !!handled };
        if(evt && evt.source && evt.source.postMessage){
          evt.source.postMessage(msg, '*');
        } else {
          window.parent.postMessage(msg, '*');
        }
      }catch{}
    }

    window.addEventListener('message', function(evt){
      try{
        const d = evt && evt.data;
        if(!d || d.type !== 'INTENT_COMMAND') return;
        if(d.command === 'booking.scroll'){
          const handled = tryHandleBookingScroll(null);
          respondCommandResult(evt, 'booking.scroll', d.requestId, handled);
        }
      }catch{}
    });
    
     document.addEventListener('click',function(e){
       const el=e.target.closest('button,a,[role="button"],[data-ut-intent],[data-intent]');
      if(!el)return;
       const ia=el.getAttribute('data-ut-intent')||el.getAttribute('data-intent');
      if(ia==='none'||ia==='ignore')return;
      if(el.hasAttribute('data-no-intent'))return;
      
      // PRIORITY: Check for navigation intents first
      const navIntent = detectNavIntent(el);
      if(navIntent){
        e.preventDefault();e.stopPropagation();
        executeNavIntent(navIntent.intent, navIntent.target);
        return;
      }
      
      const intent=ia||(shouldInferIntentFromElement(el)?inferIntent(el.textContent||el.getAttribute('aria-label')):null);
      if(!intent){
        // If it's a meaningful link, open research overlay instead of navigating.
        if(shouldOpenResearch(el)){
          e.preventDefault();e.stopPropagation();
          postResearch(el);
        }
        return;
      }

       // Booking intent: scroll to the on-page booking form/section if present.
       // (This is the behavior you asked for: "If there is a form present on the page, redirect straight to the form".)
       if(intent === 'booking.create'){
         const handled = tryHandleBookingScroll(el);
         if(handled){
           e.preventDefault();e.stopPropagation();
           // quick success pulse for feedback
           el.classList.add('intent-success');
           setTimeout(()=>el.classList.remove('intent-success'),2000);
           return;
         }
       }

      e.preventDefault();e.stopPropagation();
      el.classList.add('intent-loading');
      if(el.disabled!==undefined)el.disabled=true;
      console.log('[Intent] Triggering:',intent);
      window.parent.postMessage({type:'INTENT_TRIGGER',intent:intent,payload:collectPayload(el)},'*');
      setTimeout(()=>{
        el.classList.remove('intent-loading');
        el.classList.add('intent-success');
        if(el.disabled!==undefined)el.disabled=false;
        setTimeout(()=>el.classList.remove('intent-success'),2000);
      },300);
    },{capture:true});
    
     document.addEventListener('submit',function(e){
      const form=e.target;if(!form||form.tagName!=='FORM')return;
       let intent=form.getAttribute('data-ut-intent')||form.getAttribute('data-intent');
      if(!intent){
        const btn=form.querySelector('button[type="submit"],button:not([type])');
         if(btn)intent=btn.getAttribute('data-ut-intent')||btn.getAttribute('data-intent')||inferIntent(btn.textContent);
      }
      if(!intent){
        const id=(form.id||'').toLowerCase();
        if(id.includes('contact'))intent='contact.submit';
        else if(id.includes('newsletter')||id.includes('subscribe'))intent='newsletter.subscribe';
        else if(id.includes('waitlist'))intent='join.waitlist';
        else if(id.includes('booking')||id.includes('reservation'))intent='booking.create';
        else if(id.includes('quote'))intent='quote.request';
      }
      if(!intent)return;
      e.preventDefault();
      const p={};new FormData(form).forEach((v,k)=>{if(typeof v==='string')p[k]=v});
      console.log('[Intent] Form submit:',intent);
      window.parent.postMessage({type:'INTENT_TRIGGER',intent:intent,payload:p},'*');
      form.reset();
    },{capture:true});
    
    console.log('[Intent] Global listener active');
  })();
  </script>
  <style>
    .intent-loading{opacity:0.6;pointer-events:none;cursor:wait}
    .intent-success{animation:intent-pulse 0.3s}
    @keyframes intent-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
  </style>`;
  
  // Try to inject before </body>, or before </html>, or at the end
  if (html.includes('</head>')) {
    html = html.replace('</head>', animationFailsafe + '\n</head>');
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', intentListenerScript + '\n</body>');
  } else if (html.includes('</html>')) {
    return html.replace('</html>', intentListenerScript + '\n</html>');
  } else {
    return html + animationFailsafe + intentListenerScript;
  }
}

/**
 * Convert JSX/React code to static HTML
 */
function jsxToHtml(jsxCode: string): string {
  // Extract the return statement content
  let content = '';
  
  // Try to find the JSX in the return statement
  const returnMatch = jsxCode.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*\}(?:\s*;?\s*(?:export|$))?/);
  
  if (returnMatch && returnMatch[1]) {
    content = returnMatch[1];
  } else {
    // Try arrow function implicit return
    const arrowMatch = jsxCode.match(/=>\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/m);
    if (arrowMatch && arrowMatch[1]) {
      content = arrowMatch[1];
    } else {
      // Just use whatever looks like JSX
      const jsxMatch = jsxCode.match(/<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z]+>/);
      if (jsxMatch) {
        content = jsxMatch[0];
      } else {
        content = jsxCode;
      }
    }
  }
  
  // Convert JSX to HTML
  const html = content
    // FIRST: Remove JSX comments {/* ... */} - must happen before other replacements
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    // Remove inline comments // ...
    .replace(/\/\/[^\n]*/g, '')
    // Convert JSX attributes to HTML
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    // Remove React fragments
    .replace(/<>/g, '')
    .replace(/<\/>/g, '')
    .replace(/<React\.Fragment>/g, '')
    .replace(/<\/React\.Fragment>/g, '')
    // Remove event handlers
    .replace(/\s+onClick=\{[^}]*\}/g, '')
    .replace(/\s+onChange=\{[^}]*\}/g, '')
    .replace(/\s+onSubmit=\{[^}]*\}/g, '')
    .replace(/\s+onKeyDown=\{[^}]*\}/g, '')
    .replace(/\s+onKeyUp=\{[^}]*\}/g, '')
    .replace(/\s+onFocus=\{[^}]*\}/g, '')
    .replace(/\s+onBlur=\{[^}]*\}/g, '')
    .replace(/\s+onMouseEnter=\{[^}]*\}/g, '')
    .replace(/\s+onMouseLeave=\{[^}]*\}/g, '')
    .replace(/\s+on[A-Z][a-zA-Z]*=\{[^}]*\}/g, '')
    // Remove ref attributes
    .replace(/\s+ref=\{[^}]*\}/g, '')
    // Remove style objects like style={{ color: 'red' }}
    .replace(/\s+style=\{\{[^}]*\}\}/g, '')
    // Handle inline style with variables like style={{ animationDelay: '2s' }}
    .replace(/style="\{\{[^}]*\}\}"/g, '')
    // Remove simple variable interpolations like {title}
    .replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, '')
    // Remove property access like {props.title}
    .replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+\}/g, '')
    // Convert string expressions
    .replace(/\{"([^"]*?)"\}/g, '$1')
    .replace(/\{'([^']*?)'\}/g, '$1')
    // Convert template literals
    .replace(/\{`([^`]*)`\}/g, '$1')
    // Remove any remaining curly brace expressions with simple content
    .replace(/\{[^{}]*\}/g, '')
    // Convert self-closing custom components to divs (e.g., <ArrowRight /> -> <span></span>)
    .replace(/<([A-Z][a-zA-Z]*)\s*([^>]*)\s*\/>/g, '<span class="$2"></span>')
    // Convert custom component opening tags to spans
    .replace(/<([A-Z][a-zA-Z]*)\s*([^>]*)>/g, '<span class="icon-$1">')
    // Convert custom component closing tags to spans
    .replace(/<\/([A-Z][a-zA-Z]*)>/g, '</span>');
  
  return wrapHtmlSnippet(html);
}

/**
 * Wrap an HTML snippet in a complete document
 */
function wrapHtmlSnippet(html: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          animation: {
            'fade-in': 'fadeIn 0.5s ease-out',
            'bounce-slow': 'bounce 3s infinite',
            'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
          },
          keyframes: {
            fadeIn: {
              '0%': { opacity: '0', transform: 'translateY(10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
            }
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --primary: 221.2 83.2% 53.3%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --border: 214.3 31.8% 91.4%;
      --radius: 0.75rem;
    }
    * { border-color: hsl(var(--border)); }
    body { 
      font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      margin: 0;
      min-height: 100vh;
    }
    .icon-ArrowRight::before { content: '→'; }
    .icon-Play::before { content: '▶'; }
    .icon-Star::before { content: '★'; }
    .icon-ShieldCheck::before { content: '✓'; }
    .icon-Check::before { content: '✓'; }
    .icon-ChevronRight::before { content: '›'; }
    .icon-ChevronDown::before { content: '⌄'; }
    /* Intent feedback styles */
    .intent-loading { opacity: 0.7; pointer-events: none; }
    .intent-success { animation: intent-pulse 0.3s; }
    .intent-error { animation: intent-shake 0.3s; }
    @keyframes intent-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes intent-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
    /* Failsafe: auto-reveal animated sections */
    @keyframes forceReveal { to { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-on-scroll:not(.animate-visible) { animation: forceReveal 0.6s ease-out 1.5s forwards; }
    .animate-fadeIn, [class*="animate-fade"], [class*="animate-slide"] { animation-fill-mode: forwards; }
  </style>
</head>
<body>
  ${html}
  <script>
  (function(){
    const LABEL_INTENTS = {
      'sign in':'auth.signin','log in':'auth.signin','login':'auth.signin',
      'sign up':'auth.signup','register':'auth.signup','get started':'auth.signup',
      'start free trial':'trial.start','free trial':'trial.start','try free':'trial.start',
      'join waitlist':'join.waitlist','subscribe':'newsletter.subscribe',
      'contact us':'contact.submit','get in touch':'contact.submit','send message':'contact.submit',
      'add to cart':'cart.add','buy now':'checkout.start','shop now':'shop.browse',
      'book now':'booking.create','reserve':'booking.create','reserve table':'booking.create',
      'get quote':'quote.request','get free quote':'quote.request',
      'watch demo':'demo.request','hire me':'project.inquire',
      'order online':'order.online','view menu':'menu.view','call now':'call.now'
    };
    function inferIntent(t){if(!t)return null;const l=t.toLowerCase().trim();if(LABEL_INTENTS[l])return LABEL_INTENTS[l];for(const[k,v]of Object.entries(LABEL_INTENTS))if(l.includes(k))return v;return null;}
    function shouldInferIntentFromElement(el){
      if(el.getAttribute('data-ut-intent')||el.getAttribute('data-intent'))return false;
      if(el.hasAttribute('data-no-intent'))return false;
      if(el.hasAttribute('data-ut-cta'))return true;
      const tag=(el.tagName||'').toLowerCase();
      if(tag==='a')return true;
      if(tag==='button'){
        const type=(el.getAttribute('type')||'').toLowerCase();
        if(type==='submit')return true;
      }
      return false;
    }
    function collectPayload(el){const p={};Array.from(el.attributes).forEach(a=>{if(a.name.startsWith('data-')&&a.name!=='data-intent'&&a.name!=='data-ut-intent'){const k=a.name.replace('data-','').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());try{p[k]=JSON.parse(a.value)}catch{p[k]=a.value}}});const f=el.closest('form');if(f)new FormData(f).forEach((v,k)=>{if(typeof v==='string')p[k]=v});return p;}
    function normalizeText(t){return (t||'').replace(/\\s+/g,' ').trim();}
    function shouldOpenResearch(el){
      try{
        const tag=(el.tagName||'').toLowerCase();
        const href=tag==='a'?(el.getAttribute('href')||''):'';
        const txt=normalizeText(el.textContent||el.getAttribute('aria-label')||'');
        if(!href)return false;
        if(!txt||txt.length<12)return false;
        if(href.startsWith('#'))return false;
        if(href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('javascript:'))return false;
        return true;
      }catch{return false;}
    }
    function postResearch(el){
      const href=el.getAttribute('href')||'';
      const query=normalizeText(el.textContent||el.getAttribute('aria-label')||href);
      window.parent.postMessage({type:'RESEARCH_OPEN',payload:{query,href,pageTitle:document.title,selection:query}},'*');
    }

    // Booking UX: if a booking form/section already exists on the page,
    // scroll to it inside the preview instead of notifying the parent.
    function scrollToNode(node){
      try{
        if(!node) return;
        node.scrollIntoView({ behavior: 'auto', block: 'center' });
        setTimeout(function(){
          const input = node.querySelector && node.querySelector('input:not([type="hidden"]), textarea, select');
          if(input && input.focus) input.focus();
        }, 50);
      }catch{}
    }

    function findBookingTarget(){
      const selectors=[
        'form[data-ut-intent="booking.create"]','form[data-intent="booking.create"]','form[data-booking]','[data-booking-form]',
        '#booking-form','#reservation-form','#appointment-form','.booking-form','.reservation-form','.appointment-form',
        '#booking','#book','#schedule','#appointment','#reservation',
        '[id*="booking" i]','[class*="booking" i]','[id*="reservation" i]','[class*="reservation" i]',
        '[id*="appointment" i]','[class*="appointment" i]','[id*="schedule" i]','[class*="schedule" i]',
      ];
      for(const sel of selectors){
        try{
          const node=document.querySelector(sel);
          if(node && node.querySelector && node.querySelector('input,select,textarea,button[type="submit"],button')) return node;
        }catch{}
      }
      try{
        const forms=Array.from(document.querySelectorAll('form'));
        for(const f of forms){
          const hasDate=f.querySelector('input[type="date"], [name*="date" i], [id*="date" i]');
          const hasTime=f.querySelector('input[type="time"], [name*="time" i], [id*="time" i]');
          const hasEmail=f.querySelector('input[type="email"], [name*="email" i], [id*="email" i]');
          const hasName=f.querySelector('[name*="name" i], [id*="name" i]');
          if((hasDate && hasTime) || (hasEmail && (hasDate || hasTime)) || (hasName && hasEmail)) return f;
        }
      }catch{}
      return null;
    }

    function tryHandleBookingScroll(sourceEl){
      try{
        if(sourceEl && sourceEl.closest && sourceEl.closest('form')) return false;
        const tag=(sourceEl && sourceEl.tagName ? sourceEl.tagName : '').toLowerCase();
        if(tag==='a'){
          const href=sourceEl.getAttribute('href')||'';
          if(href && href.startsWith('#') && href.length>1){
            const hashTarget=document.querySelector(href);
            if(hashTarget){scrollToNode(hashTarget);return true;}
          }
        }
        const node=findBookingTarget();
        if(node){scrollToNode(node);return true;}
      }catch{}
      return false;
    }

    function respondCommandResult(evt, command, requestId, handled){
      try{
        const msg={type:'INTENT_COMMAND_RESULT',command:command,requestId:requestId,handled:!!handled};
        if(evt && evt.source && evt.source.postMessage){
          evt.source.postMessage(msg,'*');
        } else {
          window.parent.postMessage(msg,'*');
        }
      }catch{}
    }

    window.addEventListener('message', function(evt){
      try{
        const d=evt && evt.data;
        if(!d || d.type!=='INTENT_COMMAND') return;
        if(d.command==='booking.scroll'){
          const handled=tryHandleBookingScroll(null);
          respondCommandResult(evt,'booking.scroll',d.requestId,handled);
        }
      }catch{}
    });
    document.addEventListener('click',function(e){
      const el=e.target.closest('button,a,[role="button"],[data-ut-intent],[data-intent]');if(!el)return;
      const ia=el.getAttribute('data-ut-intent')||el.getAttribute('data-intent');if(ia==='none'||ia==='ignore')return;
      if(el.hasAttribute('data-no-intent'))return;
      const intent=ia||(shouldInferIntentFromElement(el)?inferIntent(el.textContent||el.getAttribute('aria-label')):null);
      if(!intent){
        if(shouldOpenResearch(el)){
          e.preventDefault();e.stopPropagation();
          postResearch(el);
        }
        return;
      }

      if(intent==='booking.create'){
        const handled=tryHandleBookingScroll(el);
        if(handled){
          e.preventDefault();e.stopPropagation();
          el.classList.add('intent-success');
          setTimeout(()=>el.classList.remove('intent-success'),2000);
          return;
        }
      }

      e.preventDefault();e.stopPropagation();
      el.classList.add('intent-loading');el.disabled=true;
      window.parent.postMessage({type:'INTENT_TRIGGER',intent:intent,payload:collectPayload(el)},'*');
      setTimeout(()=>{el.classList.remove('intent-loading');el.classList.add('intent-success');el.disabled=false;setTimeout(()=>el.classList.remove('intent-success'),2000);},500);
    },{capture:true});
    document.addEventListener('submit',function(e){
      const form=e.target;if(!form)return;
      let intent=form.getAttribute('data-ut-intent')||form.getAttribute('data-intent');
      if(!intent){const btn=form.querySelector('button[type="submit"]');if(btn)intent=btn.getAttribute('data-ut-intent')||btn.getAttribute('data-intent')||inferIntent(btn.textContent);}
      if(!intent){const id=(form.id||'').toLowerCase();if(id.includes('contact'))intent='contact.submit';else if(id.includes('newsletter'))intent='newsletter.subscribe';else if(id.includes('waitlist'))intent='join.waitlist';else if(id.includes('booking'))intent='booking.create';}
      if(!intent)return;
      e.preventDefault();const p={};new FormData(form).forEach((v,k)=>{if(typeof v==='string')p[k]=v});
      window.parent.postMessage({type:'INTENT_TRIGGER',intent:intent,payload:p},'*');
      form.reset();
    },{capture:true});
    console.log('[Intent] Global listener active');
    // Force-reveal animated elements after 2s (failsafe for IntersectionObserver failures)
    setTimeout(function(){
      document.querySelectorAll('.animate-on-scroll:not(.animate-visible)').forEach(function(el){
        el.classList.add('animate-visible');
      });
      document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]').forEach(function(el){
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 2000);
  })();
  </script>
</body>
</html>`;
}

/**
 * Get HTML for empty state
 */
function getEmptyStateHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen flex items-center justify-center">
  <div class="text-center text-white p-8">
    <div class="text-6xl mb-4">🎨</div>
    <h1 class="text-2xl font-bold mb-2">AI Web Builder</h1>
    <p class="text-slate-400">Use the AI Assistant to generate code</p>
    <p class="text-slate-500 text-sm mt-4">Your preview will appear here</p>
  </div>
</body>
</html>`;
}

export const SimplePreview = forwardRef<SimplePreviewHandle, SimplePreviewProps>(({
  code,
  className,
  showToolbar = true,
  device = 'desktop',
  enableSelection = false,
  onElementSelect,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  
  // Expose imperative handle for delete/duplicate/update from parent
  useImperativeHandle(ref, () => ({
    getIframe: () => iframeRef.current,
    deleteElement: (selector: string) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      try {
        const el = doc.querySelector(selector);
        if (el) { el.remove(); selectedElementRef.current = null; return true; }
      } catch (e) { console.error('[SimplePreview] Delete failed:', e); }
      return false;
    },
    duplicateElement: (selector: string) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      try {
        const el = doc.querySelector(selector);
        if (el && el.parentNode) {
          const clone = el.cloneNode(true) as HTMLElement;
          if (clone.id) clone.id = `${clone.id}-copy-${Date.now()}`;
          el.parentNode.insertBefore(clone, el.nextSibling);
          return true;
        }
      } catch (e) { console.error('[SimplePreview] Duplicate failed:', e); }
      return false;
    },
    updateElement: (selector: string, updates: any) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      try {
        const el = doc.querySelector(selector) as HTMLElement | null;
        if (!el) return false;
        if (updates.textContent !== undefined) el.textContent = updates.textContent;
        if (updates.innerHTML !== undefined) el.innerHTML = updates.innerHTML;
        if (updates.styles) {
          Object.entries(updates.styles).forEach(([k, v]) => {
            (el.style as any)[k] = v;
          });
        }
        return true;
      } catch (e) { console.error('[SimplePreview] Update failed:', e); }
      return false;
    },
  }));

  // Convert code to HTML and create blob URL
  const previewUrl = useMemo(() => {
    console.log('[SimplePreview] ===== GENERATING PREVIEW =====');
    console.log('[SimplePreview] Input code length:', code?.length || 0);
    console.log('[SimplePreview] Input code preview:', code?.substring(0, 200) || 'EMPTY');
    
    const html = codeToHtml(code);
    console.log('[SimplePreview] Generated HTML length:', html.length);
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    console.log('[SimplePreview] Blob URL created:', url);
    
    return url;
  }, [code]);
  
  // When previewUrl changes (i.e. base code changed), navigate the existing iframe
  // without remounting it.  Also clean up the previous blob URL.
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevUrlRef.current;
    prevUrlRef.current = previewUrl;

    // Revoke old blob URL
    if (prev && prev !== previewUrl) {
      URL.revokeObjectURL(prev);
    }

    // Navigate the iframe imperatively so it doesn't remount
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl;
    }

    return () => {
      // On unmount, revoke current URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ---- Element selection for Edit mode ----
  const attachSelectionListeners = useCallback(() => {
    if (!enableSelection || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc || !iframeDoc.head || !iframeDoc.body) return;

    // Inject selection-mode styles: suppress intent scripts, add cursor
    const style = iframeDoc.createElement('style');
    style.id = 'simple-preview-selection-styles';
    style.textContent = `
      * { cursor: default !important; }
      button, a, [role="button"] { cursor: pointer !important; }
    `;
    if (!iframeDoc.getElementById('simple-preview-selection-styles')) {
      iframeDoc.head.appendChild(style);
    }

    let currentHovered: HTMLElement | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) return;
      if (currentHovered && currentHovered !== target) {
        removeHighlight(currentHovered);
      }
      highlightElement(target, '#3b82f6');
      currentHovered = target;
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && currentHovered === target) {
        removeHighlight(target);
        currentHovered = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const target = e.target as HTMLElement;
      if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) return;

      // Remove previous selection highlight
      if (selectedElementRef.current && selectedElementRef.current !== target) {
        removeHighlight(selectedElementRef.current);
      }

      const elementData = getSelectedElementData(target);
      console.log('[SimplePreview] Element selected:', elementData);
      onElementSelect?.(elementData);

      selectedElementRef.current = target;
      highlightElement(target, '#10b981');
    };

    iframeDoc.addEventListener('mouseover', handleMouseOver);
    iframeDoc.addEventListener('mouseout', handleMouseOut);
    // Use capture phase so our handler fires before the intent listener can
    iframeDoc.addEventListener('click', handleClick, true);

    return () => {
      iframeDoc.removeEventListener('mouseover', handleMouseOver);
      iframeDoc.removeEventListener('mouseout', handleMouseOut);
      iframeDoc.removeEventListener('click', handleClick, true);
    };
  }, [enableSelection, onElementSelect]);

  // Re-attach selection listeners whenever iframe reloads; clean up when disabled
  const selectionCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Always clean up previous listeners first
    if (selectionCleanupRef.current) {
      selectionCleanupRef.current();
      selectionCleanupRef.current = null;
    }

    // Also strip leftover selection styles & highlights from the iframe
    const iframe = iframeRef.current;
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const oldStyle = iframeDoc.getElementById('simple-preview-selection-styles');
          if (oldStyle) oldStyle.remove();
          // Remove any residual outlines
          iframeDoc.querySelectorAll('*').forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style.outline) htmlEl.style.outline = '';
            if (htmlEl.style.outlineOffset) htmlEl.style.outlineOffset = '';
          });
        }
      } catch { /* cross-origin safety */ }
    }

    if (!enableSelection || !iframe) return;

    const onLoad = () => {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        selectionCleanupRef.current = attachSelectionListeners() || null;
      }, 100);
    };

    iframe.addEventListener('load', onLoad);
    // Also try immediately in case iframe is already loaded
    selectionCleanupRef.current = attachSelectionListeners() || null;

    return () => {
      iframe.removeEventListener('load', onLoad);
      if (selectionCleanupRef.current) {
        selectionCleanupRef.current();
        selectionCleanupRef.current = null;
      }
    };
  }, [enableSelection, previewUrl, attachSelectionListeners]);
  
  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  };
  
  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };
  
  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg overflow-hidden border border-white/10', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
              <FileCode className="h-3 w-3" />
              Live Preview
            </div>
            <span className="text-xs text-muted-foreground">
              {code?.length || 0} chars
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              className="h-7 w-7 p-0"
              title="Refresh preview"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenInNewTab}
              className="h-7 w-7 p-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Preview Iframe - Device Responsive Container */}
      <div className="flex-1 relative min-h-0 flex items-start justify-center bg-zinc-100">
        <div 
          className="h-full bg-white shadow-lg transition-all duration-300"
          style={{
            width: device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%',
            maxWidth: '100%',
          }}
        >
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="w-full h-full border-0 bg-white"
          title="Code Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
        </div>
      </div>
    </div>
  );
});

SimplePreview.displayName = 'SimplePreview';

export default SimplePreview;
