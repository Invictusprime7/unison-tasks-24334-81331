/**
 * Playground Hydrator — Scans VFS nodes to auto-populate Creator's Playground.
 * 
 * When AI generates a site into VFS, this service:
 * 1. Discovers all page files and infers their type/funnel role
 * 2. Extracts structured business data (products, services, testimonials, etc.)
 * 3. Builds a funnel graph from detected page flow
 * 4. Returns a HydrationResult that can be merged into useCreatorPlayground state
 * 
 * The hydration is idempotent — re-running merges rather than overwrites.
 */

import { nanoid } from "nanoid";
import type { VirtualNode, VirtualFile } from "@/hooks/useVirtualFileSystem";
import type { CreatorData, CreatorProduct, CreatorService, CreatorTestimonial, CreatorFaqItem, CreatorBusinessInfo } from "@/types/creatorData";
import { createEmptyCreatorData } from "@/types/creatorData";
import type { PageRegistry, BuilderPage, FunnelGraph, FunnelStep, BuilderPageType, FunnelRole } from "@/types/pageRegistry";
import { createEmptyPageRegistry, createBuilderPage, createFunnelGraph } from "@/types/pageRegistry";
import {
  createCanonicalComponentInstance,
  inferCanonicalComponentSlug,
} from "@/services/canonicalComponentRegistry";

// ============================================================================
// Types
// ============================================================================

export interface HydrationResult {
  pageRegistry: PageRegistry;
  creatorData: CreatorData;
  funnelAutoWired: boolean;
  stats: {
    pagesDetected: number;
    productsExtracted: number;
    servicesExtracted: number;
    testimonialsExtracted: number;
    faqsExtracted: number;
    componentsExtracted: number;
    funnelSteps: number;
  };
}

interface DetectedPage {
  filePath: string;
  fileName: string;
  componentName: string;
  content: string;
  pageType: BuilderPageType;
  funnelRole?: FunnelRole;
  routePath: string;
  isHome: boolean;
}

// ============================================================================
// Page Type Inference
// ============================================================================

const PAGE_TYPE_MAP: Record<string, { type: BuilderPageType; role?: FunnelRole }> = {
  home: { type: "home", role: "entry" },
  index: { type: "home", role: "entry" },
  landing: { type: "landing", role: "entry" },
  about: { type: "about" },
  contact: { type: "contact" },
  shop: { type: "shop", role: "offer" },
  products: { type: "shop", role: "offer" },
  product: { type: "product", role: "offer" },
  checkout: { type: "checkout", role: "checkout" },
  cart: { type: "cart" },
  thankyou: { type: "thankyou", role: "thankyou" },
  "thank-you": { type: "thankyou", role: "thankyou" },
  thanks: { type: "thankyou", role: "thankyou" },
  confirmation: { type: "thankyou", role: "confirmation" },
  booking: { type: "booking" },
  gallery: { type: "gallery" },
  blog: { type: "blog" },
  faq: { type: "faq" },
  pricing: { type: "pricing", role: "offer" },
  legal: { type: "legal" },
  privacy: { type: "legal" },
  terms: { type: "legal" },
};

function inferPageType(fileName: string, content: string): { type: BuilderPageType; role?: FunnelRole } {
  const baseName = fileName.replace(/\.(tsx|jsx|ts|js|html)$/i, "").toLowerCase();
  
  // Direct match
  if (PAGE_TYPE_MAP[baseName]) return PAGE_TYPE_MAP[baseName];

  // Content-based inference
  if (/\b(add.?to.?cart|product.?grid|shop|price.*\$)/i.test(content)) {
    return { type: "shop", role: "offer" };
  }
  if (/\b(checkout|payment|stripe|pay\s+now)/i.test(content)) {
    return { type: "checkout", role: "checkout" };
  }
  if (/\b(thank\s*you|order\s*confirm|success)/i.test(content)) {
    return { type: "thankyou", role: "thankyou" };
  }
  if (/\b(book\s*(now|appointment|session)|calendar|availability)/i.test(content)) {
    return { type: "booking" };
  }
  if (/\b(gallery|portfolio|showcase)/i.test(content)) {
    return { type: "gallery" };
  }
  if (/\b(faq|frequently\s*asked|questions?\s*&?\s*answers)/i.test(content)) {
    return { type: "faq" };
  }
  if (/\b(pricing|plans?|tiers?|subscription)/i.test(content)) {
    return { type: "pricing", role: "offer" };
  }
  if (/\b(contact\s*us|get\s*in\s*touch|send\s*(us\s*)?a?\s*message)/i.test(content)) {
    return { type: "contact" };
  }
  if (/\b(about\s*us|our\s*(story|mission|team))/i.test(content)) {
    return { type: "about" };
  }

  return { type: "custom" };
}

// ============================================================================
// Route Path Extraction from App.tsx Router
// ============================================================================

function extractRoutesFromApp(appContent: string): Map<string, string> {
  const routes = new Map<string, string>(); // componentName -> routePath
  
  // Match <Route path="/xxx" element={<Xxx />} />
  const routeRe = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*element=\{?\s*<(\w+)/gi;
  let match: RegExpExecArray | null;
  while ((match = routeRe.exec(appContent)) !== null) {
    routes.set(match[2], match[1]);
  }
  
  // Also match reversed: element before path
  const routeRe2 = /<Route\s+[^>]*element=\{?\s*<(\w+)[^>]*path=["']([^"']+)["']/gi;
  while ((match = routeRe2.exec(appContent)) !== null) {
    routes.set(match[1], match[2]);
  }
  
  return routes;
}

// ============================================================================
// Content Extractors — Pull structured data from JSX source
// ============================================================================

function extractProducts(content: string): CreatorProduct[] {
  const products: CreatorProduct[] = [];
  
  // Match product-like objects: { name: "...", price: N, ... }
  const productBlockRe = /\{\s*(?:name|title)\s*:\s*["']([^"']+)["'][^}]*price\s*:\s*(\d+(?:\.\d+)?)[^}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = productBlockRe.exec(content)) !== null) {
    products.push({
      productId: `prod_${nanoid(8)}`,
      name: match[1],
      price: parseFloat(match[2]),
      currency: "USD",
      inStock: true,
      sortOrder: products.length,
    });
  }
  
  // Match card-like patterns with price strings: $29.99
  if (products.length === 0) {
    const priceRe = /["']([^"']{3,40})["'][^}]{0,200}\$(\d+(?:\.\d{2})?)/g;
    while ((match = priceRe.exec(content)) !== null) {
      const name = match[1];
      if (/^[A-Z]/.test(name) && !/className|style|href|src/i.test(name)) {
        products.push({
          productId: `prod_${nanoid(8)}`,
          name,
          price: parseFloat(match[2]),
          currency: "USD",
          inStock: true,
          sortOrder: products.length,
        });
      }
    }
  }
  
  return products;
}

function extractServices(content: string): CreatorService[] {
  const services: CreatorService[] = [];
  
  // Match service-like objects
  const serviceRe = /\{\s*(?:name|title|service)\s*:\s*["']([^"']+)["'][^}]*(?:description|desc)\s*:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = serviceRe.exec(content)) !== null) {
    services.push({
      serviceId: `svc_${nanoid(8)}`,
      name: match[1],
      description: match[2],
      bookable: false,
      sortOrder: services.length,
    });
  }
  
  return services;
}

function extractTestimonials(content: string): CreatorTestimonial[] {
  const testimonials: CreatorTestimonial[] = [];
  
  // Match testimonial patterns: { quote/text: "...", author/name: "..." }
  const testRe = /\{\s*(?:quote|text|content|testimonial)\s*:\s*["']([^"']+)["'][^}]*(?:author|name|client)\s*:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = testRe.exec(content)) !== null) {
    testimonials.push({
      testimonialId: `test_${nanoid(8)}`,
      content: match[1],
      author: match[2],
      sortOrder: testimonials.length,
    });
  }
  
  // Reverse order: author before quote
  const testRe2 = /\{\s*(?:author|name|client)\s*:\s*["']([^"']+)["'][^}]*(?:quote|text|content|testimonial)\s*:\s*["']([^"']+)["']/g;
  while ((match = testRe2.exec(content)) !== null) {
    const exists = testimonials.some(t => t.author === match![1]);
    if (!exists) {
      testimonials.push({
        testimonialId: `test_${nanoid(8)}`,
        content: match[2],
        author: match[1],
        sortOrder: testimonials.length,
      });
    }
  }
  
  return testimonials;
}

function extractFaqs(content: string): CreatorFaqItem[] {
  const faqs: CreatorFaqItem[] = [];
  
  const faqRe = /\{\s*(?:question|q)\s*:\s*["']([^"']+)["'][^}]*(?:answer|a)\s*:\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = faqRe.exec(content)) !== null) {
    faqs.push({
      faqId: `faq_${nanoid(8)}`,
      question: match[1],
      answer: match[2],
      sortOrder: faqs.length,
    });
  }
  
  return faqs;
}

function extractBusinessInfo(allContent: string): Partial<CreatorBusinessInfo> {
  const info: Partial<CreatorBusinessInfo> = {};
  
  // Business name from title/h1
  const titleMatch = allContent.match(/<(?:title|h1)[^>]*>([^<]{2,60})<\/(?:title|h1)>/i);
  if (titleMatch) info.businessName = titleMatch[1].trim();
  
  // Tagline from subtitle
  const taglineMatch = allContent.match(/<(?:p|h2|span)[^>]*class(?:Name)?=["'][^"']*(?:tagline|subtitle|hero.*desc|lead)[^"']*["'][^>]*>([^<]{5,120})<\//i);
  if (taglineMatch) info.tagline = taglineMatch[1].trim();
  
  // Email
  const emailMatch = allContent.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) info.email = emailMatch[0];
  
  // Phone
  const phoneMatch = allContent.match(/(?:\+1\s?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch) info.phone = phoneMatch[0];
  
  return info;
}

function getTagAttribute(attributes: string, attributeName: string) {
  const match = attributes.match(new RegExp(`${attributeName}=["']([^"']+)["']`, "i"));
  return match?.[1] || "";
}

function extractComponentInstances(
  pages: DetectedPage[],
  creatorData: CreatorData,
): CreatorData["componentInstances"] {
  const componentInstances: CreatorData["componentInstances"] = {};
  const firstForm = Object.values(creatorData.forms)[0];
  const firstProduct = Object.values(creatorData.products)[0];

  for (const page of pages) {
    let order = 0;
    const tagRegex = /<([a-z0-9-]+)\b([^>]*(?:data-ut-component-slug|data-component)=["'][^"']+["'][^>]*)>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(page.content)) !== null) {
      const attributes = match[2] || "";
      const explicitSlug = getTagAttribute(attributes, "data-ut-component-slug");
      const rawComponent = getTagAttribute(attributes, "data-component");
      const slug = explicitSlug || inferCanonicalComponentSlug(rawComponent);
      if (!slug) continue;

      const bindings: Record<string, string> = {};
      const formId = getTagAttribute(attributes, "data-form-id") || firstForm?.formId || "";
      const calendarId = getTagAttribute(attributes, "data-calendar-id");
      const productId = getTagAttribute(attributes, "data-product-id") || firstProduct?.productId || "";

      if (formId && ["contact-form", "request-quote", "newsletter-signup"].includes(slug)) {
        bindings.formId = formId;
      }
      if (calendarId && slug === "booking-scheduler") {
        bindings.calendarId = calendarId;
      }
      if (productId && slug === "checkout-cta") {
        bindings.productId = productId;
      }

      const instance = createCanonicalComponentInstance(slug, {
        label: `${slug.replace(/-/g, " ")} ${order + 1}`,
        usedOnPages: [`page_${page.componentName.toLowerCase()}`],
        bindings,
        props: {
          hydratedFrom: page.filePath,
          sourceComponent: rawComponent || explicitSlug,
          order,
        },
      });

      if (!instance) continue;

      instance.status = Object.keys(bindings).length > 0 ? "ready" : "stubbed";
      componentInstances[instance.instanceId] = instance;
      order += 1;
    }
  }

  return componentInstances;
}

// ============================================================================
// Funnel Auto-Wirer
// ============================================================================

/** Canonical funnel role ordering for auto-wiring */
const FUNNEL_ROLE_ORDER: FunnelRole[] = [
  "entry", "offer", "checkout", "upsell", "downsell", "confirmation", "thankyou"
];

function autoWireFunnel(pages: DetectedPage[]): FunnelGraph | null {
  // Filter pages that have funnel roles
  const funnelPages = pages.filter(p => p.funnelRole);
  if (funnelPages.length < 2) return null;
  
  // Sort by canonical role order
  funnelPages.sort((a, b) => {
    const aIdx = FUNNEL_ROLE_ORDER.indexOf(a.funnelRole!);
    const bIdx = FUNNEL_ROLE_ORDER.indexOf(b.funnelRole!);
    return aIdx - bIdx;
  });
  
  // Build steps
  const steps: FunnelStep[] = funnelPages.map((page, i) => ({
    stepId: `step_${nanoid(6)}`,
    pageId: `page_${page.componentName.toLowerCase()}`,
    role: page.funnelRole!,
    nextStepId: null, // linked below
    sortOrder: i,
  }));
  
  // Link chain
  for (let i = 0; i < steps.length - 1; i++) {
    steps[i].nextStepId = steps[i + 1].stepId;
  }
  
  return createFunnelGraph(`funnel_${nanoid(8)}`, "Main Funnel", steps);
}

// ============================================================================
// Main Hydrator
// ============================================================================

export function hydratePlaygroundFromVFS(
  nodes: VirtualNode[],
  sandpackFiles: Record<string, string>,
): HydrationResult {
  const registry = createEmptyPageRegistry();
  const data = createEmptyCreatorData();
  
  // 1. Find App.tsx to extract route mappings
  const appContent = sandpackFiles["/src/App.tsx"] || sandpackFiles["/App.tsx"] || "";
  const routeMap = extractRoutesFromApp(appContent);
  
  // 2. Discover all page files
  const detectedPages: DetectedPage[] = [];
  const allContent: string[] = [];
  
  for (const [filePath, content] of Object.entries(sandpackFiles)) {
    // Only process page-like files
    const isPage = filePath.match(/^\/src\/pages\/(\w+)\.(tsx|jsx)$/i) 
      || filePath.match(/^\/src\/App\.(tsx|jsx)$/i)
      || filePath === "/src/App.tsx";
    
    if (!isPage && !filePath.includes("/pages/")) continue;
    
    allContent.push(content);
    
    const fileName = filePath.split("/").pop() || "";
    const baseName = fileName.replace(/\.(tsx|jsx|ts|js)$/i, "");
    const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    
    // Skip App.tsx as a page — it's the router
    if (baseName === "App" || baseName === "main" || baseName === "index") continue;
    
    const { type, role } = inferPageType(baseName, content);
    
    // Determine route path
    let routePath = routeMap.get(componentName) 
      || routeMap.get(`${componentName}Page`)
      || `/${baseName.toLowerCase()}`;
    
    const isHome = routePath === "/" || baseName.toLowerCase() === "home" || baseName.toLowerCase() === "index";
    if (isHome) routePath = "/";
    
    detectedPages.push({
      filePath,
      fileName,
      componentName,
      content,
      pageType: type,
      funnelRole: role,
      routePath,
      isHome,
    });
  }
  
  // Also treat App.tsx as "home" page if no dedicated Home page exists
  if (!detectedPages.some(p => p.isHome) && appContent) {
    const { type, role } = inferPageType("home", appContent);
    detectedPages.unshift({
      filePath: "/src/App.tsx",
      fileName: "App.tsx",
      componentName: "Home",
      content: appContent,
      pageType: type || "home",
      funnelRole: role || "entry",
      routePath: "/",
      isHome: true,
    });
  }
  
  // 3. Create BuilderPage entries
  for (const page of detectedPages) {
    const pageId = `page_${page.componentName.toLowerCase()}`;
    const builderPage = createBuilderPage(
      pageId,
      page.componentName.replace(/Page$/, ""),
      page.routePath,
      page.pageType,
      {
        funnelRole: page.funnelRole,
        isHome: page.isHome,
        navOrder: detectedPages.indexOf(page),
        showInNav: !["checkout", "thankyou", "cart", "legal"].includes(page.pageType),
        source: { kind: "react_tsx", content: page.content, contentHash: nanoid(8) },
        createdBy: "ai",
      }
    );
    registry.pages[pageId] = builderPage;
    if (page.isHome) registry.homePageId = pageId;
  }
  
  // 4. Auto-wire funnel
  const funnel = autoWireFunnel(detectedPages);
  let funnelAutoWired = false;
  if (funnel) {
    registry.funnels[funnel.funnelId] = funnel;
    // Tag pages with funnelId
    for (const step of funnel.steps) {
      if (registry.pages[step.pageId]) {
        registry.pages[step.pageId].funnelId = funnel.funnelId;
        registry.pages[step.pageId].funnelRole = step.role;
      }
    }
    funnelAutoWired = true;
  }
  
  // 5. Extract structured content from all pages
  const combinedContent = allContent.join("\n");
  
  const products = extractProducts(combinedContent);
  for (const p of products) data.products[p.productId] = p;
  
  const services = extractServices(combinedContent);
  for (const s of services) data.services[s.serviceId] = s;
  
  const testimonials = extractTestimonials(combinedContent);
  for (const t of testimonials) data.testimonials[t.testimonialId] = t;
  
  const faqs = extractFaqs(combinedContent);
  for (const f of faqs) data.faqs[f.faqId] = f;
  
  const bizInfo = extractBusinessInfo(combinedContent);
  data.businessInfo = { ...data.businessInfo, ...bizInfo };
  data.componentInstances = extractComponentInstances(detectedPages, data);
  
  // Set version
  registry.version = 1;
  
  return {
    pageRegistry: registry,
    creatorData: data,
    funnelAutoWired,
    stats: {
      pagesDetected: detectedPages.length,
      productsExtracted: products.length,
      servicesExtracted: services.length,
      testimonialsExtracted: testimonials.length,
      faqsExtracted: faqs.length,
      componentsExtracted: Object.keys(data.componentInstances).length,
      funnelSteps: funnel?.steps.length || 0,
    },
  };
}

// ============================================================================
// Merge utility — idempotent reconciliation
// ============================================================================

export function mergeHydrationResult(
  existing: { pageRegistry: PageRegistry; creatorData: CreatorData },
  incoming: HydrationResult,
): { pageRegistry: PageRegistry; creatorData: CreatorData } {
  const mergedRegistry: PageRegistry = {
    ...existing.pageRegistry,
    version: existing.pageRegistry.version + 1,
  };
  
  // Merge pages: incoming wins for new pages, existing wins for already-present pages
  for (const [pageId, page] of Object.entries(incoming.pageRegistry.pages)) {
    if (!mergedRegistry.pages[pageId]) {
      mergedRegistry.pages[pageId] = page;
    }
  }
  
  // Set home page if not already set
  if (!mergedRegistry.homePageId && incoming.pageRegistry.homePageId) {
    mergedRegistry.homePageId = incoming.pageRegistry.homePageId;
  }
  
  // Merge funnels
  for (const [funnelId, funnel] of Object.entries(incoming.pageRegistry.funnels)) {
    if (!mergedRegistry.funnels[funnelId]) {
      mergedRegistry.funnels[funnelId] = funnel;
    }
  }
  
  // Merge creator data: append new items, don't overwrite existing
  const mergedData: CreatorData = { ...existing.creatorData };
  
  for (const [id, p] of Object.entries(incoming.creatorData.products)) {
    if (!mergedData.products[id]) mergedData.products[id] = p;
  }
  for (const [id, s] of Object.entries(incoming.creatorData.services)) {
    if (!mergedData.services[id]) mergedData.services[id] = s;
  }
  for (const [id, t] of Object.entries(incoming.creatorData.testimonials)) {
    if (!mergedData.testimonials[id]) mergedData.testimonials[id] = t;
  }
  for (const [id, f] of Object.entries(incoming.creatorData.faqs)) {
    if (!mergedData.faqs[id]) mergedData.faqs[id] = f;
  }
  for (const [id, component] of Object.entries(incoming.creatorData.componentInstances)) {
    if (!mergedData.componentInstances[id]) mergedData.componentInstances[id] = component;
  }
  
  // Business info: merge fields, prefer existing non-empty values
  mergedData.businessInfo = {
    ...incoming.creatorData.businessInfo,
    ...Object.fromEntries(
      Object.entries(existing.creatorData.businessInfo).filter(([, v]) => v !== undefined && v !== "")
    ),
  } as CreatorBusinessInfo;
  
  return { pageRegistry: mergedRegistry, creatorData: mergedData };
}
