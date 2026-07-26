import { isSandpackAllowedImport } from '@/utils/sandpackDependencies';
import { UNISON_VFS_STYLE_BRIDGE } from '@/utils/unisonVfsStyleBridge';

/**
 * Canonical generated UI foundation.
 *
 * These files are emitted by the canonical pipeline, not authored by Lane B.
 * Generated pages can compose the primitives, but Stage 4b remains the only
 * owner of global theme tokens and CSS.
 */

export const GENERATED_UI_FOUNDATION_VERSION = '1.1' as const;

export type GeneratedUiLayoutRecipe =
  | 'floating-navbar'
  | 'collage-hero'
  | 'bento-features'
  | 'media-card-grid'
  | 'conversion-form'
  | 'rich-footer';

export type GeneratedUiInteraction =
  | 'mobile-nav-dialog'
  | 'image-lightbox'
  | 'accordion'
  | 'tabs';

export interface GeneratedUiManifest {
  version: typeof GENERATED_UI_FOUNDATION_VERSION;
  importRoot: '@/unison/ui';
  primitiveImports: string[];
  runtimeFacades: {
    icons: '@/unison/ui/icons';
    animation: '@/unison/ui/animation';
    schemas: '@/unison/ui/zod';
    forms: '@/unison/ui/forms';
    styles: '@/unison/ui/styles';
    radix: '@/unison/ui/radix';
    radixPrimitives: readonly string[];
  };
  iconLibrary: 'lucide-react';
  layoutRecipes: GeneratedUiLayoutRecipe[];
  interactions: GeneratedUiInteraction[];
  requirements: string[];
}

export interface GeneratedUiFoundationOptions {
  industry?: string | null;
  templateId?: string | null;
  themePresetId: string;
  needsBooking?: boolean;
  wantsLeadCapture?: boolean;
  sellsProducts?: boolean;
}

export interface GeneratedUiFoundation {
  manifest: GeneratedUiManifest;
  files: Record<string, string>;
}

export interface GeneratedUiContractValidation {
  valid: boolean;
  violations: string[];
}

const FOUNDATION_MARKER = 'UNISON GENERATED UI FOUNDATION';

const RADIX_VFS_PRIMITIVES = [
  'accordion',
  'alert-dialog',
  'aspect-ratio',
  'avatar',
  'checkbox',
  'collapsible',
  'context-menu',
  'dialog',
  'dropdown-menu',
  'hover-card',
  'label',
  'menubar',
  'navigation-menu',
  'popover',
  'progress',
  'radio-group',
  'scroll-area',
  'select',
  'separator',
  'slider',
  'slot',
  'switch',
  'tabs',
  'toast',
  'toggle',
  'toggle-group',
  'tooltip',
] as const;

function toPascalCase(value: string): string {
  return value.replace(/(^|-)\w/g, (segment) => segment.replace('-', '').toUpperCase());
}

function buildRuntimeFacades(): GeneratedUiManifest['runtimeFacades'] {
  return {
    icons: '@/unison/ui/icons',
    animation: '@/unison/ui/animation',
    schemas: '@/unison/ui/zod',
    forms: '@/unison/ui/forms',
    styles: '@/unison/ui/styles',
    radix: '@/unison/ui/radix',
    radixPrimitives: [...RADIX_VFS_PRIMITIVES],
  };
}

function buildManifest(options: GeneratedUiFoundationOptions): GeneratedUiManifest {
  const requirements = [
    'Prefer manifest-backed @/unison/ui imports; supported Sandpack UI packages are also available.',
    'Use semantic Stage 4b Tailwind tokens; do not overwrite /src/index.css.',
    'Use @/unison/ui/icons for Lucide icons and provide accessible labels for icon-only actions.',
    'Use responsive Tailwind variants and preserve data-ut-intent attributes on actionable controls.',
    'For @/unison/ui/motion, use only Reveal, RevealGroup, Stagger, StaggerItem, and MotionRecipe.',
  ];

  if (options.needsBooking) requirements.push('Include an intent-bound booking CTA or form.');
  if (options.wantsLeadCapture) requirements.push('Include a labeled, intent-bound lead capture form.');
  if (options.sellsProducts) requirements.push('Include product or offer cards with intent-bound actions.');

  return {
    version: GENERATED_UI_FOUNDATION_VERSION,
    importRoot: '@/unison/ui',
    primitiveImports: [
      '@/unison/ui',
      '@/unison/ui/button',
      '@/unison/ui/card',
      '@/unison/ui/form-fields',
      '@/unison/ui/forms',
      '@/unison/ui/icon',
      '@/unison/ui/icons',
      '@/unison/ui/media',
      '@/unison/ui/motion',
      '@/unison/ui/animation',
      '@/unison/ui/navigation',
      '@/unison/ui/recipes',
      '@/unison/ui/styles',
      '@/unison/ui/tailwind.css',
      '@/unison/ui/zod',
      '@/unison/ui/radix',
      ...RADIX_VFS_PRIMITIVES.map((primitive) => `@/unison/ui/radix/${primitive}`),
    ],
    runtimeFacades: buildRuntimeFacades(),
    iconLibrary: 'lucide-react',
    layoutRecipes: [
      'floating-navbar',
      'collage-hero',
      'bento-features',
      'media-card-grid',
      'conversion-form',
      'rich-footer',
    ],
    interactions: ['mobile-nav-dialog', 'image-lightbox', 'accordion', 'tabs'],
    requirements,
  };
}

function buildFoundationFiles(manifest: GeneratedUiManifest): Record<string, string> {
  const marker = `// ${FOUNDATION_MARKER} v${manifest.version}`;
  const radixFiles = Object.fromEntries(
    RADIX_VFS_PRIMITIVES.map((primitive) => [
      `/src/unison/ui/radix/${primitive}.ts`,
      primitive === 'slot'
        ? `${marker}
export { Slot, Slottable } from './slot-safe';
`
        : `${marker}
export * from '@radix-ui/react-${primitive}';
`,
    ]),
  );

  const radixIndex = RADIX_VFS_PRIMITIVES
    .map((primitive) => `export * as ${toPascalCase(primitive)} from './${primitive}';`)
    .join('\n');

  return {
    '/src/unison/ui/cn.ts': `${marker}
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
    '/src/unison/ui/animation.ts': `${marker}
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export * from 'framer-motion';

type StaggerProps = { children: React.ReactNode; className?: string };

/**
 * Compatibility aliases for pre-foundation generated pages.
 * These MUST stay behaviourally identical to /src/unison/ui/motion.tsx:
 * a container that renders its own <div> inside a parent grid collapses every
 * child into the first cell. Layout-transparent unless it owns classes.
 */
export function StaggerContainer({ children, className }: StaggerProps) {
  const reduceMotion = useReducedMotion();
  if (!className) return React.createElement(React.Fragment, null, children);
  return React.createElement(motion.div, {
    className,
    initial: 'hidden',
    whileInView: 'show',
    viewport: { once: true, amount: 0.12 },
    variants: { hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.09 } } },
  }, children);
}

export function StaggerChild({ children, className }: StaggerProps) {
  const reduceMotion = useReducedMotion();
  const reveal = { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 };
  const shown = { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' } };
  // Self-animating so items still reveal when the container is transparent.
  return React.createElement(motion.div, {
    className,
    initial: reveal,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' },
    variants: { hidden: reveal, show: shown },
  }, children);
}

export const Stagger = StaggerContainer;
export const StaggerItem = StaggerChild;
export const RevealGroup = StaggerContainer;
`,
    '/src/unison/ui/icons.ts': `${marker}
import * as React from 'react';
import * as Lucide from 'lucide-react';

export * from 'lucide-react';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const MissingBrandIcon: IconComponent = (props) => React.createElement(
  'svg',
  { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, ...props },
  React.createElement('circle', { cx: 12, cy: 12, r: 9 }),
  React.createElement('path', { d: 'M8 12h8M12 8v8' }),
);

const brandIcon = (name: string): IconComponent => (
  (Lucide as Record<string, IconComponent | undefined>)[name] || MissingBrandIcon
);

// Sandpack's Lucide runtime omits brand marks; generated social links must still render.
export const Instagram = brandIcon('Instagram');
export const Facebook = brandIcon('Facebook');
`,
    '/src/unison/ui/zod.ts': `${marker}
export * from 'zod';
`,
    '/src/unison/ui/forms.ts': `${marker}
export * from 'react-hook-form';
export { zodResolver } from '@hookform/resolvers/zod';
export { z } from './zod';
`,
    '/src/unison/ui/radix/slot-safe.tsx': `${marker}
import * as React from 'react';
import { Slot as RadixSlot, Slottable } from '@radix-ui/react-slot';

export { Slottable };

/**
 * Radix's Slot throws when \`asChild\` receives text, fragments, or multiple
 * children (a very common shape in generated pages: icon + label).
 * This wrapper degrades to a plain <span> instead of crashing the preview.
 */
export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    const list = React.Children.toArray(children).filter((child) => child !== null && child !== undefined && child !== false && child !== '');
    const only = list.length === 1 ? list[0] : null;
    const slottable = list.some(
      (child) => React.isValidElement(child) && (child.type as { displayName?: string } | undefined)?.displayName === 'Slottable',
    );

    if (slottable || (React.isValidElement(only) && only.type !== React.Fragment)) {
      return <RadixSlot ref={ref as never} {...props}>{children}</RadixSlot>;
    }

    return <span ref={ref as React.Ref<HTMLSpanElement>} {...props}>{children}</span>;
  },
);
Slot.displayName = 'Slot';
`,
    '/src/unison/ui/radix/index.ts': `${marker}
${radixIndex}
`,

    ...radixFiles,
    '/src/unison/ui/styles.ts': `${marker}
import { cn } from './cn';

export const typography = {
  display: 'font-heading headline-xl text-foreground',
  heading: 'font-heading headline-lg text-foreground',
  subheading: 'font-heading headline-md text-foreground',
  body: 'font-body body-md text-muted-foreground',
  lead: 'font-body body-lg text-muted-foreground',
  eyebrow: 'font-body text-xs font-semibold uppercase tracking-[0.16em] text-primary',
} as const;

export const colorStyles = {
  page: 'bg-background text-foreground',
  surface: 'border border-border bg-card text-card-foreground shadow-sm',
  muted: 'bg-muted text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
} as const;

export const componentStyles = {
  section: 'px-5 py-16 sm:px-8 lg:py-24',
  container: 'mx-auto w-full max-w-6xl',
  card: 'rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm',
  interactiveCard: 'rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl focus-within:ring-2 focus-within:ring-ring',
  button: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[calc(var(--radius)-0.125rem)] px-4 py-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;

export const motionStyles = {
  fade: 'motion-safe:transition-opacity motion-safe:duration-300',
  lift: 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1',
  scale: 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-[1.02]',
  attention: 'motion-safe:animate-pulse',
} as const;

export function styles(...classNames: Array<string | false | null | undefined>) {
  return cn(...classNames);
}
`,
    '/src/unison/ui/tailwind.css': `${marker}
/* Stage 4b owns the global Tailwind layers and theme tokens in /src/index.css. */
${UNISON_VFS_STYLE_BRIDGE}`,
  '/src/unison/ui/index.ts': `${marker}
export { Button } from './button';
export { Card, CardContent } from './card';
export { FieldLabel, Input, Textarea } from './form-fields';
export { useForm, zodResolver, z } from './forms';
export { Icon } from './icon';
export { ImageLightbox } from './media';
export { Reveal, RevealGroup, Stagger, StaggerItem } from './motion';
export { FloatingNavbar } from './navigation';
export { BentoFeatureGrid, FeatureCard } from './recipes';
export { colorStyles, componentStyles, motionStyles, styles, typography } from './styles';
// Compatibility surface for generated pages that import Lucide components
// from the UI root instead of the dedicated /icons facade.
export * from './icons';
`,
    '/src/unison/ui/button.tsx': `${marker}
import * as React from 'react';
import { Slot } from './radix/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[calc(var(--radius)-0.125rem)] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
      },
      size: { default: 'h-10', sm: 'h-9 px-3 text-xs', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const safeChildren = React.Children.map(children, (child) => (
      React.isValidElement(child) && !child.type ? null : child
    ));
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>{safeChildren}</Comp>;
  },
);
Button.displayName = 'Button';
`,
    '/src/unison/ui/card.tsx': `${marker}
import * as React from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('group rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-xl font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}
`,
    '/src/unison/ui/form-fields.tsx': `${marker}
import * as React from 'react';
  import * as LabelPrimitive from './radix/label';
import { cn } from './cn';

export function FieldLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('flex h-10 w-full rounded-[calc(var(--radius)-0.125rem)] border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('flex min-h-28 w-full rounded-[calc(var(--radius)-0.125rem)] border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
}
`,
    '/src/unison/ui/icon.tsx': `${marker}
  import type { LucideIcon } from './icons';
import { cn } from './cn';

export function Icon({ icon: Glyph, className, label }: { icon: LucideIcon; className?: string; label?: string }) {
  return <Glyph aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined} className={cn('size-4 shrink-0', className)} />;
}
`,
    '/src/unison/ui/media.tsx': `${marker}
  import * as Dialog from './radix/dialog';
  import { Expand } from './icons';
import { cn } from './cn';

export function ImageLightbox({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <Dialog.Root><Dialog.Trigger asChild><button type="button" className={cn('group relative block overflow-hidden rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}><img src={src} alt={alt} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105" /><span className="absolute inset-0 grid place-items-center bg-foreground/0 text-background transition-colors group-hover:bg-foreground/45"><Expand className="size-6 opacity-0 transition-opacity group-hover:opacity-100" /></span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,72rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius)] bg-card shadow-2xl"><Dialog.Title className="sr-only">{alt}</Dialog.Title><img src={src} alt={alt} className="max-h-[85vh] w-full object-contain" /></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
`,
    '/src/unison/ui/motion.tsx': `${marker}
import * as React from 'react';
  import { motion, useReducedMotion } from './animation';
import { cn } from './cn';

export type MotionRecipe = 'editorial-reveal' | 'product-focus' | 'service-progressive-disclosure' | 'proof-led-stagger' | 'gallery-inspection' | 'conversion-feedback';

const recipeOffset: Record<MotionRecipe, number> = {
  'editorial-reveal': 20,
  'product-focus': 14,
  'service-progressive-disclosure': 16,
  'proof-led-stagger': 12,
  'gallery-inspection': 10,
  'conversion-feedback': 8,
};

export function Reveal({ children, className, recipe = 'editorial-reveal' }: { children: React.ReactNode; className?: string; recipe?: MotionRecipe }) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : recipeOffset[recipe];
  return <motion.div className={cn(className)} initial={{ opacity: reduceMotion ? 1 : 0, y: offset }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}>{children}</motion.div>;
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  // Layout-transparent by default: a wrapper div here would collapse every card
  // into the first cell of a parent grid/flex row (fragmented, left-glued pages).
  if (!className) return <>{children}</>;
  return <motion.div className={cn(className)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.12 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}>{children}</motion.div>;
}

export function RevealGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Stagger className={className}>{children}</Stagger>;
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  // Self-animating so items still reveal when Stagger is layout-transparent.
  return <motion.div className={cn('h-full', className)} initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }} variants={{ hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' } } }}>{children}</motion.div>;
}
`,
    '/src/unison/ui/navigation.tsx': `${marker}
import * as React from 'react';
  import * as Dialog from './radix/dialog';
  import { Menu, X } from './icons';
import { Button } from './button';
import { cn } from './cn';

export interface NavigationLink { label: string; href: string; intent?: string; }

export function FloatingNavbar({ brand, links, ctaLabel, ctaIntent, className }: { brand: string; links: NavigationLink[]; ctaLabel?: string; ctaIntent?: string; className?: string }) {
  return <header className={cn('sticky top-3 z-40 mx-auto w-[min(100%-1.5rem,72rem)] rounded-[var(--radius)] border border-border bg-background/80 px-4 py-3 shadow-sm backdrop-blur-md', className)}><div className="flex items-center justify-between gap-4"><a href="#top" className="text-base font-bold text-foreground">{brand}</a><nav className="hidden items-center gap-5 md:flex">{links.map((link) => <a key={link.href} href={link.href} data-ut-intent={link.intent || 'nav.anchor'} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>)}</nav>{ctaLabel && <Button className="hidden md:inline-flex" data-ut-intent={ctaIntent || 'cta.primary'}>{ctaLabel}</Button>}<Dialog.Root><Dialog.Trigger asChild><button type="button" aria-label="Open navigation" className="grid size-10 place-items-center rounded-[calc(var(--radius)-0.125rem)] hover:bg-accent md:hidden"><Menu className="size-5" /></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" /><Dialog.Content className="fixed right-3 top-3 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-[var(--radius)] border border-border bg-card p-5 shadow-xl"><div className="mb-6 flex items-center justify-between"><Dialog.Title className="font-semibold">{brand}</Dialog.Title><Dialog.Close asChild><button type="button" aria-label="Close navigation" className="grid size-9 place-items-center rounded-[calc(var(--radius)-0.125rem)] hover:bg-accent"><X className="size-5" /></button></Dialog.Close></div><nav className="grid gap-2">{links.map((link) => <Dialog.Close key={link.href} asChild><a href={link.href} data-ut-intent={link.intent || 'nav.anchor'} className="rounded-[calc(var(--radius)-0.125rem)] px-3 py-3 text-foreground hover:bg-accent">{link.label}</a></Dialog.Close>)}{ctaLabel && <Button data-ut-intent={ctaIntent || 'cta.primary'}>{ctaLabel}</Button>}</nav></Dialog.Content></Dialog.Portal></Dialog.Root></div></header>;
}
`,
    '/src/unison/ui/recipes.tsx': `${marker}
import * as React from 'react';
import { Card, CardContent } from './card';
import { cn } from './cn';

export function BentoFeatureGrid({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>{children}</div>;
}

export function FeatureCard({ title, description, media, className }: { title: string; description: string; media?: React.ReactNode; className?: string }) {
  return <Card className={cn('min-h-56 overflow-hidden', className)}><CardContent className="flex h-full flex-col gap-4">{media}<div className="mt-auto"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div></CardContent></Card>;
}
`,
    '/.unison/ui-manifest.json': JSON.stringify(manifest, null, 2),
  };
}

export function buildGeneratedUiFoundation(
  options: GeneratedUiFoundationOptions,
): GeneratedUiFoundation {
  const manifest = buildManifest(options);
  return { manifest, files: buildFoundationFiles(manifest) };
}

/** Reads the snapshot-owned UI contract from a VFS without fabricating one. */
export function readGeneratedUiManifest(
  files: Record<string, string> | null | undefined,
): GeneratedUiManifest | null {
  const raw = files?.['/.unison/ui-manifest.json'];
  if (!raw) return null;
  try {
    const manifest = JSON.parse(raw) as Partial<GeneratedUiManifest>;
    if (
      manifest.version !== GENERATED_UI_FOUNDATION_VERSION ||
      manifest.importRoot !== '@/unison/ui' ||
      !Array.isArray(manifest.primitiveImports) ||
      !manifest.primitiveImports.every((path) => typeof path === 'string')
    ) {
      return null;
    }
    const runtimeFacades = manifest.runtimeFacades &&
      Array.isArray(manifest.runtimeFacades.radixPrimitives)
      ? manifest.runtimeFacades
      : buildRuntimeFacades();
    return { ...manifest, runtimeFacades } as GeneratedUiManifest;
  } catch {
    return null;
  }
}

/**
 * Validate Lane B sources before they merge with the canonical snapshot. The
 * foundation itself imports Radix/CVA internals. Generated pages may also
 * compose any UI-capable package supported by the Sandpack runtime, while
 * snapshot-owned files and unsafe output remain protected.
 */
export function validateGeneratedUiContract(
  files: Record<string, string>,
  manifest: Pick<GeneratedUiManifest, 'importRoot' | 'primitiveImports'> | null | undefined,
): GeneratedUiContractValidation {
  if (!manifest) {
    return { valid: false, violations: ['Wizard snapshot is missing its generated UI manifest.'] };
  }

  const violations: string[] = [];
  const approvedLocalImports = new Set(manifest.primitiveImports);
  for (const path of Object.keys(files)) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (
      normalizedPath.startsWith('/src/unison/ui/') ||
      normalizedPath === '/.unison/ui-manifest.json' ||
      normalizedPath === '/.unison/design-intervention.json'
    ) {
      violations.push(`${normalizedPath} attempts to replace a snapshot-owned UI foundation file.`);
    }
    if (normalizedPath === '/src/index.css') {
      violations.push('/src/index.css is Stage 4b-owned and cannot be replaced by Lane B output.');
    }
  }
  const generatedSources = Object.entries(files).filter(([path]) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return /\.(tsx|jsx)$/i.test(path) && !normalizedPath.startsWith('/src/unison/ui/');
  });
  const importPattern = /(?:\bimport\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s*|\bexport\s+(?:[\s\S]*?)\s+from\s*|\bimport\s*)['"]([^'"]+)['"]/g;
  const motionImportPattern = /\bimport\s+(?:type\s+)?\{([^}]+)\}\s+from\s*['"]@\/unison\/ui\/motion['"];?/g;
  const supportedMotionExports = new Set(['Reveal', 'RevealGroup', 'Stagger', 'StaggerItem', 'MotionRecipe']);

  for (const [path, source] of generatedSources) {
    if (source.includes('dangerouslySetInnerHTML')) {
      violations.push(`${path} uses dangerouslySetInnerHTML, which is not allowed in Lane B output.`);
    }
    if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(source)) {
      violations.push(`${path} contains an image without an alt attribute.`);
    }

    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (
        isSandpackAllowedImport(specifier) ||
        specifier.startsWith('.') ||
        specifier.startsWith('@/components/ui/')
      ) {
        continue;
      }
      if (approvedLocalImports.has(specifier)) {
        continue;
      }
      if (specifier.startsWith(`${manifest.importRoot}/`)) {
        violations.push(`${path} imports unapproved UI module "${specifier}".`);
        continue;
      }
      violations.push(`${path} imports unsupported module "${specifier}".`);
    }

    for (const match of source.matchAll(motionImportPattern)) {
      const unsupported = match[1]
        .split(',')
        .map((part) => part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim())
        .filter((exportName) => exportName && !supportedMotionExports.has(exportName));
      if (unsupported.length > 0) {
        violations.push(
          `${path} imports unsupported motion facade export(s): ${unsupported.join(', ')}. ` +
          'Use only Reveal, RevealGroup, Stagger, StaggerItem, and MotionRecipe from @/unison/ui/motion.',
        );
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
