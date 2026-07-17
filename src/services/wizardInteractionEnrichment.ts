import type { TemplateLayoutContract } from './templateLayoutContract';

export type WizardInteractionEffect =
  | 'hover-lift'
  | 'hover-glow'
  | 'reveal'
  | 'stagger-reveal'
  | 'click-feedback';

export type WizardInteractionTargetKind = 'template-root' | 'interactive' | 'intent';

export interface WizardInteractionRule {
  target: { kind: WizardInteractionTargetKind; value?: string };
  effect: WizardInteractionEffect;
}

export interface WizardInteractionManifest {
  version: '1.0';
  source: 'baseline' | 'ai';
  templateId: string;
  layoutSignature: string;
  industry: string;
  interactions: WizardInteractionRule[];
}

const ALLOWED_EFFECTS = new Set<WizardInteractionEffect>([
  'hover-lift', 'hover-glow', 'reveal', 'stagger-reveal', 'click-feedback',
]);
const ALLOWED_TARGETS = new Set<WizardInteractionTargetKind>([
  'template-root', 'interactive', 'intent',
]);

function collectIntents(files: Record<string, string>): string[] {
  const intents = new Set<string>();
  for (const source of Object.values(files)) {
    for (const match of source.matchAll(/data-ut-intent\s*=\s*["']([^"']+)["']/g)) {
      intents.add(match[1]);
    }
  }
  return Array.from(intents);
}

function normalizeRule(value: unknown): WizardInteractionRule | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { target?: { kind?: unknown; value?: unknown }; effect?: unknown };
  const kind = raw.target?.kind;
  const effect = raw.effect;
  if (typeof kind !== 'string' || !ALLOWED_TARGETS.has(kind as WizardInteractionTargetKind)) return null;
  if (typeof effect !== 'string' || !ALLOWED_EFFECTS.has(effect as WizardInteractionEffect)) return null;
  if (kind === 'intent' && (typeof raw.target?.value !== 'string' || !raw.target.value.trim())) return null;
  return {
    target: { kind: kind as WizardInteractionTargetKind, value: typeof raw.target?.value === 'string' ? raw.target.value.trim() : undefined },
    effect: effect as WizardInteractionEffect,
  };
}

function uniqueRules(rules: WizardInteractionRule[]): WizardInteractionRule[] {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    const key = `${rule.target.kind}:${rule.target.value || ''}:${rule.effect}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

export function createBaselineInteractionManifest(
  files: Record<string, string>,
  contract: TemplateLayoutContract,
): WizardInteractionManifest {
  const intents = collectIntents(files);
  const interactions: WizardInteractionRule[] = [
    { target: { kind: 'template-root' }, effect: 'reveal' },
    { target: { kind: 'interactive' }, effect: 'hover-lift' },
    { target: { kind: 'interactive' }, effect: 'stagger-reveal' },
    ...intents.slice(0, 5).map((intent) => ({
      target: { kind: 'intent' as const, value: intent },
      effect: 'click-feedback' as const,
    })),
  ];
  return {
    version: '1.0',
    source: 'baseline',
    templateId: contract.templateId,
    layoutSignature: contract.signature,
    industry: contract.industry,
    interactions: uniqueRules(interactions),
  };
}

export function parseWizardInteractionManifest(
  payload: unknown,
  fallback: WizardInteractionManifest,
): WizardInteractionManifest {
  const raw = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : null;
  const candidates: unknown[] = [
    raw?.interactionManifest,
    raw?.interactionPlan,
    raw?.plan,
    raw?.content,
    raw?.response,
  ];

  for (const candidate of candidates) {
    let parsed = candidate;
    if (typeof candidate === 'string') {
      try {
        parsed = JSON.parse(candidate.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, ''));
      } catch {
        continue;
      }
    }
    if (!parsed || typeof parsed !== 'object') continue;
    const value = parsed as { templateId?: unknown; layoutSignature?: unknown; interactions?: unknown };
    if (value.templateId !== fallback.templateId || value.layoutSignature !== fallback.layoutSignature) continue;
    if (!Array.isArray(value.interactions)) continue;
    const knownIntents = new Set(
      fallback.interactions
        .filter((rule) => rule.target.kind === 'intent')
        .map((rule) => rule.target.value),
    );
    const interactions = uniqueRules(value.interactions
      .map(normalizeRule)
      .filter((rule): rule is WizardInteractionRule => Boolean(rule))
      .filter((rule) => rule.target.kind !== 'intent' || knownIntents.has(rule.target.value)));
    if (interactions.length === 0) continue;
    return { ...fallback, source: 'ai', interactions };
  }
  return fallback;
}

export function buildWizardInteractionPlannerPrompt(args: {
  contract: TemplateLayoutContract;
  industry: string;
  intents: string[];
}): string {
  return [
    'Plan the final interaction layer for an already validated wizard site.',
    `Industry: ${args.industry}. Template: ${args.contract.templateId}.`,
    `Template layout signature: ${args.contract.signature}.`,
    `Available canonical intents: ${args.intents.join(', ') || 'none'}.`,
    `Return ONLY JSON: {"templateId":"${args.contract.templateId}","layoutSignature":"${args.contract.signature}","interactions":[{"target":{"kind":"template-root|interactive|intent","value":"required only for intent"},"effect":"hover-lift|hover-glow|reveal|stagger-reveal|click-feedback"}]}.`,
    'Use at most 12 rules. Choose interactions that fit the industry and template.',
    'Do not return TSX, CSS, imports, files, routes, handlers, or arbitrary selectors.',
    'Do not alter data-ut-intent, template layout, theme tokens, or page topology.',
  ].join('\n');
}

function selectorFor(rule: WizardInteractionRule): string {
  if (rule.target.kind === 'template-root') return '[data-ut-template-id]';
  if (rule.target.kind === 'intent') return `[data-ut-intent="${rule.target.value!.replace(/"/g, '\\"')}"]`;
  return 'button, a[href], [role="button"], [data-ut-intent]';
}

function runtimeModule(manifest: WizardInteractionManifest): string {
  const plan = manifest.interactions.map((rule) => ({ selector: selectorFor(rule), effect: rule.effect }));
  return `import { useEffect } from 'react';

const INTERACTIONS = ${JSON.stringify(plan)} as const;

function showFeedback(label: string) {
  const existing = document.querySelector('[data-ut-interaction-feedback]');
  if (existing) existing.remove();
  const notice = document.createElement('div');
  notice.dataset.utInteractionFeedback = 'true';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.className = 'ut-interaction-feedback';
  notice.textContent = label || 'Action selected';
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 1800);
}

export default function UnisonInteractionRuntime() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const style = document.createElement('style');
    style.dataset.unisonInteractions = 'true';
    style.textContent = \
      '.ut-interaction-hover-lift{transition:transform 180ms ease,box-shadow 180ms ease}.ut-interaction-hover-lift:hover{transform:translateY(-3px);box-shadow:0 12px 24px hsl(var(--primary)/.16)}' +
      '.ut-interaction-hover-glow{transition:box-shadow 180ms ease}.ut-interaction-hover-glow:hover{box-shadow:0 0 0 3px hsl(var(--primary)/.22)}' +
      '.ut-interaction-reveal{opacity:0;transform:translateY(14px);transition:opacity 420ms ease,transform 420ms ease}.ut-interaction-visible{opacity:1;transform:translateY(0)}' +
      '.ut-interaction-feedback{position:fixed;right:1rem;bottom:1rem;z-index:9999;background:hsl(var(--foreground));color:hsl(var(--background));padding:.75rem 1rem;border-radius:var(--radius);box-shadow:0 12px 24px hsl(var(--foreground)/.18)}';
    document.head.appendChild(style);
    const cleanup: Array<() => void> = [() => style.remove()];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add('ut-interaction-visible');
    }, { threshold: 0.16 });
    cleanup.push(() => observer.disconnect());

    for (const rule of INTERACTIONS) {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(rule.selector));
      elements.forEach((element, index) => {
        if (rule.effect === 'hover-lift') element.classList.add('ut-interaction-hover-lift');
        if (rule.effect === 'hover-glow') element.classList.add('ut-interaction-hover-glow');
        if (rule.effect === 'reveal' || rule.effect === 'stagger-reveal') {
          element.classList.add('ut-interaction-reveal');
          if (rule.effect === 'stagger-reveal') element.style.transitionDelay = String(Math.min(index * 70, 420)) + 'ms';
          observer.observe(element);
        }
        if (rule.effect === 'click-feedback') {
          const onClick = () => showFeedback(element.getAttribute('data-ut-label') || element.textContent?.trim() || 'Action selected');
          element.addEventListener('click', onClick);
          cleanup.push(() => element.removeEventListener('click', onClick));
        }
      });
    }
    return () => cleanup.forEach((dispose) => dispose());
  }, []);
  return null;
}
`;
}

function injectRuntime(source: string, pagePath: string): string | null {
  const hasRuntimeMount = /<UnisonInteractionRuntime\s*\/?\s*>/.test(source);
  const withRuntime = hasRuntimeMount
    ? source
    : source
      .replace(/(return\s*\(\s*<[A-Za-z][\w.]*\b[^>]*>)/, '$1\n      <UnisonInteractionRuntime />')
      .replace(/(return\s+<[A-Za-z][\w.]*\b[^>]*>)/, '$1\n      <UnisonInteractionRuntime />')
      .replace(/(return\s*\(\s*<>)/, '$1\n      <UnisonInteractionRuntime />')
      .replace(/(return\s+<>)/, '$1\n      <UnisonInteractionRuntime />');
  if (!hasRuntimeMount && withRuntime === source) return null;
  const depth = pagePath.replace(/^\/src\/pages\/?/, '').split('/').length - 1;
  const importPath = `${'../'.repeat(depth + 1)}components/UnisonInteractionRuntime`;
  return /import\s+UnisonInteractionRuntime\s+from\s+['"][^'"]+['"]/.test(withRuntime)
    ? withRuntime
    : `import UnisonInteractionRuntime from '${importPath}';\n${withRuntime}`;
}

export function compileWizardInteractionManifest(
  files: Record<string, string>,
  manifest: WizardInteractionManifest,
): { files: Record<string, string>; mountedPages: string[] } {
  const next = { ...files, '/src/components/UnisonInteractionRuntime.tsx': runtimeModule(manifest) };
  const mountedPages: string[] = [];
  for (const [path, source] of Object.entries(files)) {
    if (!/\/src\/pages\/.*\.(?:tsx|jsx)$/i.test(path)) continue;
    const injected = injectRuntime(source, path);
    if (!injected) continue;
    next[path] = injected;
    mountedPages.push(path);
  }
  next['/.unison/interaction-manifest.json'] = JSON.stringify(manifest, null, 2);
  return { files: next, mountedPages };
}

/**
 * Restore the constrained interaction contract from the durable VFS. This is
 * intentionally separate from planner parsing: later compiler passes must
 * never call the AI again just to preserve an already approved interaction
 * layer.
 */
export function readWizardInteractionManifest(
  files: Record<string, string>,
): WizardInteractionManifest | null {
  const raw = files['/.unison/interaction-manifest.json'];
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<WizardInteractionManifest>;
    if (
      parsed.version !== '1.0' ||
      (parsed.source !== 'baseline' && parsed.source !== 'ai') ||
      typeof parsed.templateId !== 'string' || !parsed.templateId ||
      typeof parsed.layoutSignature !== 'string' || !parsed.layoutSignature ||
      typeof parsed.industry !== 'string' || !parsed.industry ||
      !Array.isArray(parsed.interactions)
    ) {
      return null;
    }

    const interactions = uniqueRules(parsed.interactions
      .map(normalizeRule)
      .filter((rule): rule is WizardInteractionRule => Boolean(rule)));
    if (interactions.length === 0) return null;

    return {
      version: '1.0',
      source: parsed.source,
      templateId: parsed.templateId,
      layoutSignature: parsed.layoutSignature,
      industry: parsed.industry,
      interactions,
    };
  } catch {
    return null;
  }
}

/**
 * Canonical finalization hook used by the platform compiler and launch VFS.
 * It turns a persisted plan back into its runtime module after any Lane B or
 * playground rewrite, keeping the plan data authoritative rather than a
 * one-time SystemLauncher side effect.
 */
export function applyCanonicalInteractionEnrichment(
  files: Record<string, string>,
  manifest?: WizardInteractionManifest | null,
): { files: Record<string, string>; manifest: WizardInteractionManifest | null; mountedPages: string[] } {
  const resolvedManifest = manifest || readWizardInteractionManifest(files);
  if (!resolvedManifest) {
    return { files, manifest: null, mountedPages: [] };
  }

  const compiled = compileWizardInteractionManifest(files, resolvedManifest);
  return {
    files: compiled.files,
    manifest: resolvedManifest,
    mountedPages: compiled.mountedPages,
  };
}