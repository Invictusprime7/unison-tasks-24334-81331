import { describe, expect, it } from 'vitest';
import {
  buildGeneratedUiFoundation,
  ensureGeneratedUiFoundation,
  getGeneratedUiFoundationPersistenceViolations,
  healKnownGeneratedUiImportMistakes,
  readGeneratedUiManifest,
  validateGeneratedUiContract,
} from '@/platform/core/generatedUiFoundation';
import { normalizeLauncherFiles, prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { sanitizeTsxFile } from '@/utils/tsxSanitizer';

describe('generated UI foundation', () => {
  const foundation = buildGeneratedUiFoundation({
    industry: 'salon',
    themePresetId: 'organic',
    needsBooking: true,
  });

  it('emits portable, token-driven VFS primitives and a manifest', () => {
    expect(foundation.files['/.unison/ui-manifest.json']).toContain('@/unison/ui/button');
    expect(foundation.files['/src/unison/ui/button.tsx']).toContain('bg-primary');
    expect(foundation.files['/src/unison/ui/card.tsx']).toContain('export function CardHeader');
    expect(foundation.files['/src/unison/ui/card.tsx']).toContain('export function CardTitle');
    expect(foundation.files['/src/unison/ui/card.tsx']).toContain('export function CardDescription');
    expect(foundation.files['/src/unison/ui/card.tsx']).toContain('export function CardFooter');
    expect(foundation.files['/src/unison/ui/form-fields.tsx']).toContain('export function FormField');
    expect(foundation.files['/src/unison/ui/form-fields.tsx']).toContain('export function FormFields');
    expect(foundation.files['/src/unison/ui/form-fields.tsx']).toContain('export function Select');
    expect(foundation.files['/src/unison/ui/form-fields.tsx']).toContain('export function Checkbox');
    expect(foundation.files['/src/unison/ui/form-fields.tsx']).toContain('export function FormGrid');
    expect(foundation.files['/src/unison/ui/button.tsx']).toContain('export function IconButton');
    expect(foundation.files['/src/unison/ui/button.tsx']).toContain("destructive:");
    expect(foundation.files['/src/unison/ui/icons.ts']).toContain("export const Linkedin = brandIcon('Linkedin');");
    expect(foundation.files['/src/unison/ui/navigation.tsx']).toContain("from './radix/dialog'");
    expect(foundation.files['/src/unison/ui/radix/dialog.ts']).toContain("@radix-ui/react-dialog");
    expect(foundation.files['/src/unison/ui/icon.tsx']).toContain('LucideIcon');
    expect(foundation.files['/src/unison/ui/button.tsx']).toContain('React.isValidElement(child) && !child.type ? null : child');
    expect(foundation.files['/src/unison/ui/motion.tsx']).toContain('useReducedMotion');
    expect(foundation.files['/src/unison/ui/motion.tsx']).toContain('export function RevealGroup');
    expect(foundation.files['/src/unison/ui/animation.ts']).toContain('export function StaggerContainer');
    expect(foundation.files['/src/unison/ui/animation.ts']).toContain('export function StaggerChild');
    expect(foundation.files['/src/unison/ui/index.ts']).toContain("export { Reveal, RevealGroup, Stagger, StaggerItem, type MotionRecipe } from './motion';");
    // Root barrel must expose the full surface of every foundation module, or
    // a page importing e.g. CardHeader from '@/unison/ui' renders undefined.
    expect(foundation.files['/src/unison/ui/index.ts']).toContain("export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';");
    expect(foundation.files['/src/unison/ui/index.ts']).toContain("FormField, FormFields, FormGrid, FormHint, FormError } from './form-fields';");
    expect(foundation.files['/src/unison/ui/index.ts']).toContain("export { Slot, Slottable } from './radix/slot';");
    expect(foundation.files['/src/unison/ui/index.ts']).toContain("export { cn } from './cn';");
    // Animation aliases must stay layout-transparent like motion.tsx Stagger.
    expect(foundation.files['/src/unison/ui/animation.ts']).toContain('if (!className) return React.createElement(React.Fragment, null, children);');
    expect(foundation.files['/src/unison/ui/icons.ts']).toContain("export * from 'lucide-react';");
    expect(foundation.files['/src/unison/ui/icons.ts']).toContain("export const Instagram = brandIcon('Instagram');");
    expect(foundation.files['/src/unison/ui/icons.ts']).toContain("export const Facebook = brandIcon('Facebook');");
    expect(foundation.files['/src/unison/ui/zod.ts']).toContain("export * from 'zod';");
    expect(foundation.files['/src/unison/ui/forms.ts']).toContain("zodResolver");
    expect(foundation.files['/src/unison/ui/styles.ts']).toContain('export const typography');
    expect(foundation.files['/src/unison/ui/tailwind.css']).toContain('Stage 4b owns');
    expect(foundation.files['/src/unison/ui/tailwind.css']).toContain('.unison-interactive-surface');
    expect(foundation.manifest.primitiveImports).toContain('@/unison/ui');
    expect(foundation.manifest.primitiveImports).toContain('@/unison/ui/motion');
    expect(foundation.manifest.primitiveImports).toContain('@/unison/ui/icons');
    expect(foundation.manifest.primitiveImports).toContain('@/unison/ui/zod');
    expect(foundation.manifest.primitiveImports).toContain('@/unison/ui/radix/dialog');
    expect(foundation.manifest.primitiveImports).toContain('@/unison/ui/tailwind.css');
    expect(foundation.manifest.runtimeFacades.icons).toBe('@/unison/ui/icons');
    expect(foundation.manifest.runtimeFacades.animation).toBe('@/unison/ui/animation');
    expect(foundation.manifest.runtimeFacades.radixPrimitives).toContain('dialog');
    expect(foundation.manifest.formFormats).toContain('appointment');
    expect(foundation.manifest.buttonFormats).toContain('icon');
    expect(foundation.manifest.iconFormats).toContain('social');
  });

  it('reads only a valid snapshot-owned manifest from VFS', () => {
    expect(readGeneratedUiManifest(foundation.files)).toEqual(foundation.manifest);
    const legacyManifest = { ...foundation.manifest } as Record<string, unknown>;
    delete legacyManifest.runtimeFacades;
    expect(readGeneratedUiManifest({
      '/.unison/ui-manifest.json': JSON.stringify(legacyManifest),
    })?.runtimeFacades.radixPrimitives).toContain('dialog');
    expect(readGeneratedUiManifest({
      '/.unison/ui-manifest.json': JSON.stringify({ importRoot: '@/unison/ui' }),
    })).toBeNull();
    expect(readGeneratedUiManifest(null)).toBeNull();
  });

  it('normalizes legacy 1.1 manifests into the expanded component-format registry', () => {
    const legacyManifest = { ...foundation.manifest, version: '1.1' } as Record<string, unknown>;
    delete legacyManifest.formFormats;
    delete legacyManifest.buttonFormats;
    delete legacyManifest.iconFormats;

    const manifest = readGeneratedUiManifest({
      '/.unison/ui-manifest.json': JSON.stringify(legacyManifest),
    });

    expect(manifest?.version).toBe('1.2');
    expect(manifest?.formFormats).toContain('appointment');
    expect(manifest?.buttonFormats).toContain('icon');
    expect(manifest?.iconFormats).toContain('social');
  });

  it('rehydrates an incomplete Stage 4b foundation before downstream use', () => {
    const incomplete = { ...foundation.files };
    delete incomplete['/src/unison/ui/recipes.tsx'];

    expect(getGeneratedUiFoundationPersistenceViolations(incomplete)).toContain(
      'missing /src/unison/ui/recipes.tsx',
    );
    const rehydrated = ensureGeneratedUiFoundation(incomplete, {
      industry: 'salon',
      themePresetId: 'organic',
      needsBooking: true,
    });
    expect(rehydrated.files['/src/unison/ui/recipes.tsx']).toContain('BentoFeatureGrid');
    expect(getGeneratedUiFoundationPersistenceViolations(rehydrated.files)).toEqual([]);
  });

  it('upgrades legacy wizard snapshots with missing facade files during preview preparation', () => {
    const legacyManifest = { ...foundation.manifest } as Record<string, unknown>;
    delete legacyManifest.runtimeFacades;
    const prepared = prepareSandpackFiles({
      '/.unison/ui-manifest.json': JSON.stringify(legacyManifest),
      '/src/App.tsx': "import { motion } from '@/unison/ui/animation'; export default function App(){ return <motion.main>Ready</motion.main>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/animation.ts']).toContain("export * from '../../motion-shim'");
    expect(prepared['/App.tsx']).toContain("from './unison/ui/animation'");
  });

  it('restores compatible stagger exports for existing generated pages', () => {
    const legacyAnimationFacade = foundation.files['/src/unison/ui/animation.ts']
      .replace(/import \* as React[\s\S]*?export const StaggerItem = StaggerChild;\n/, "export * from 'framer-motion';\n");
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/unison/ui/animation.ts': legacyAnimationFacade,
      '/src/App.tsx': "import { StaggerChild, StaggerContainer } from '@/unison/ui/animation'; export default function App(){ return <StaggerContainer><StaggerChild>Ready</StaggerChild></StaggerContainer>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/animation.ts']).toContain('export function StaggerContainer');
    expect(prepared['/unison/ui/animation.ts']).toContain('export function StaggerChild');
    expect(prepared['/App.tsx']).toContain("from './unison/ui/animation'");
    expect(prepared['/index.tsx']).not.toContain('⚠ missing component');
  });

  it('restores the RevealGroup motion compatibility export for existing generated pages', () => {
    const legacyMotionFacade = foundation.files['/src/unison/ui/motion.tsx']
      .replace(/\nexport function RevealGroup[\s\S]*?\n}\n(?=\nexport function StaggerItem)/, '');
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/unison/ui/motion.tsx': legacyMotionFacade,
      '/src/pages/Home.tsx': "import { RevealGroup } from '@/unison/ui/motion'; export default function Home(){ return <RevealGroup>Ready</RevealGroup>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/pages/Home.tsx' });

    expect(prepared['/unison/ui/motion.tsx']).toContain('export function RevealGroup');
    expect(prepared['/pages/Home.tsx']).toContain("from '../unison/ui/motion'");
    expect(prepared['/index.tsx']).not.toContain('⚠ missing component');
  });

  it('refreshes marker-owned motion facades before the preview compiler runs', () => {
    const legacyMotionFacade = foundation.files['/src/unison/ui/motion.tsx']
      .replace(/\nexport function RevealGroup[\s\S]*?\n}\n(?=\nexport function StaggerItem)/, '');
    const normalized = normalizeLauncherFiles({
      ...foundation.files,
      '/src/unison/ui/motion.tsx': legacyMotionFacade,
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    });

    expect(normalized['/src/unison/ui/motion.tsx']).toContain('export function RevealGroup');
  });

  it('refreshes unmarked legacy foundation CSS and preserves unknown user files', () => {
    const normalized = normalizeLauncherFiles({
      ...foundation.files,
      '/src/unison/ui/tailwind.css': '.legacy-interactive-surface { display: none; }',
      '/src/unison/ui/custom.css': '.user-owned { color: hotpink; }',
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    });

    expect(normalized['/src/unison/ui/tailwind.css']).toContain('UNISON VFS STYLE BRIDGE');
    expect(normalized['/src/unison/ui/tailwind.css']).not.toContain('.legacy-interactive-surface');
    expect(normalized['/src/unison/ui/custom.css']).toBe('.user-owned { color: hotpink; }');
  });

  it('injects semantic shadcn Tailwind configuration into preserved VFS HTML', () => {
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/index.html': '<!doctype html><html><head><title>Custom</title></head><body><div id="root"></div></body></html>',
      '/src/App.tsx': 'export default function App(){ return <button className="bg-primary text-primary-foreground">Book</button>; }',
      '/src/index.css': ':root { --primary: 0 0% 10%; --primary-foreground: 0 0% 100%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/index.html']).toContain('<title>Custom</title>');
    expect(prepared['/index.html']).toContain('data-unison-semantic-tailwind');
    expect(prepared['/index.html']).toContain("primary: {");
    expect(prepared['/index.html']).toContain('https://cdn.tailwindcss.com');
  });

  it('restores the complete card facade before rendering Pricing and Services pages', () => {
    const legacyCardFacade = `${foundation.files['/src/unison/ui/card.tsx'].split('export function CardHeader')[0]}export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}
`;
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/unison/ui/card.tsx': legacyCardFacade,
      '/src/App.tsx': "import Pricing from './pages/Pricing'; import Services from './pages/Services'; export default function App(){ return <><Pricing /><Services /></>; }",
      '/src/pages/Pricing.tsx': "import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../unison/ui/card'; export default function Pricing(){ return <Card><CardHeader><CardTitle>Plans</CardTitle><CardDescription>Choose a plan</CardDescription></CardHeader><CardContent>Details</CardContent></Card>; }",
      '/src/pages/Services.tsx': "import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../unison/ui/card'; export default function Services(){ return <Card><CardHeader><CardTitle>Services</CardTitle><CardDescription>Explore our services</CardDescription></CardHeader><CardContent>Details</CardContent></Card>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/card.tsx']).toContain('export function CardHeader');
    expect(prepared['/unison/ui/card.tsx']).toContain('export function CardTitle');
    expect(prepared['/unison/ui/card.tsx']).toContain('export function CardDescription');
    expect(prepared['/pages/Pricing.tsx']).toContain("from '../unison/ui/card'");
    expect(prepared['/pages/Services.tsx']).toContain("from '../unison/ui/card'");
  });

  it('recovers the UI foundation when a legacy VFS imports its facade without a manifest', () => {
    const prepared = prepareSandpackFiles({
      '/src/App.tsx': "import { motion } from '@/unison/ui/animation'; export default function App(){ return <motion.main>Ready</motion.main>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/animation.ts']).toContain("export * from '../../motion-shim'");
    expect(prepared['/App.tsx']).toContain("from './unison/ui/animation'");
  });

  it('accepts foundation imports and rejects alternate UI writers', () => {
    const accepted = validateGeneratedUiContract({
      '/src/pages/Home.tsx': `import { Button } from '@/unison/ui/button'; export default function Home(){ return <Button data-ut-intent="booking.create">Book</Button>; }`,
    }, foundation.manifest);
    expect(accepted).toEqual({ valid: true, violations: [] });

    const powerfulUiImports = validateGeneratedUiContract({
      '/src/pages/Experience.tsx': `import * as Dialog from '@/unison/ui/radix/dialog'; import { motion } from '@/unison/ui/animation'; import { useForm, z, zodResolver } from '@/unison/ui/forms'; import { Calendar } from '@/unison/ui/icons'; import { Card, componentStyles, typography } from '@/unison/ui'; export default function Experience(){ const { register } = useForm({ resolver: zodResolver(z.object({ email: z.string().email() })) }); return <Dialog.Root><motion.div className={componentStyles.card}><Card><Calendar aria-hidden /><h1 className={typography.heading}>Join</h1><input {...register('email')} /></Card></motion.div></Dialog.Root>; }`,
    }, foundation.manifest);
    expect(powerfulUiImports).toEqual({ valid: true, violations: [] });

    const tailwindOnly = validateGeneratedUiContract({
      '/src/pages/About.tsx': `export default function About(){ return <main className="bg-background text-foreground"><h1>About us</h1></main>; }`,
    }, foundation.manifest);
    expect(tailwindOnly).toEqual({ valid: true, violations: [] });

    const rejected = validateGeneratedUiContract({
      '/src/pages/Home.tsx': `import { ImageLightbox } from '@/unison/ui/image-lightbox'; export default function Home(){ return <img src="/hero.jpg" />; }`,
      '/src/unison/ui/button.tsx': 'export const Button = () => null;',
      '/src/index.css': ':root { --primary: 0 0% 0%; }',
      '/.unison/design-intervention.json': '{}',
    }, foundation.manifest);
    expect(rejected.valid).toBe(false);
    expect(rejected.violations.join(' ')).toContain('unapproved UI module');
    expect(rejected.violations.join(' ')).toContain('without an alt');
    expect(rejected.violations.join(' ')).toContain('snapshot-owned');
    expect(rejected.violations.join(' ')).toContain('Stage 4b-owned');
    expect(rejected.violations.join(' ')).toContain('design-intervention.json');

    const unsupportedMotion = validateGeneratedUiContract({
      '/src/pages/Home.tsx': "import { MotionGroup } from '@/unison/ui/motion'; export default function Home(){ return <MotionGroup />; }",
    }, foundation.manifest);
    expect(unsupportedMotion.valid).toBe(false);
    expect(unsupportedMotion.violations.join(' ')).toContain('unsupported motion facade export(s): MotionGroup');
  });

  it('heals the cn-utils and bare-tailwind Lane B import hallucinations before validation', () => {
    const hallucinated = {
      '/src/pages/About.tsx': `import { Fragment } from 'react';\nimport { cn } from '@/unison/lib/utils';\nimport '@/unison/ui/tailwind';\nconst example = '@/unison/lib/utils';\nexport default function About(){ return <Fragment><main className={cn('bg-background')}>About us</main><span>{example}</span></Fragment>; }`,
    };

    const rejectedBefore = validateGeneratedUiContract(hallucinated, foundation.manifest);
    expect(rejectedBefore.valid).toBe(false);

    const healed = healKnownGeneratedUiImportMistakes(hallucinated);
    expect(healed.healed).toEqual(['/src/pages/About.tsx']);
    expect(healed.files['/src/pages/About.tsx']).toContain("import { Fragment } from 'react'");
    expect(healed.files['/src/pages/About.tsx']).toContain("from '@/unison/ui'");
    expect(healed.files['/src/pages/About.tsx']).toContain("const example = '@/unison/lib/utils'");
    expect(healed.files['/src/pages/About.tsx']).not.toContain('@/unison/ui/tailwind');

    const acceptedAfter = validateGeneratedUiContract(healed.files, foundation.manifest);
    expect(acceptedAfter).toEqual({ valid: true, violations: [] });
  });

  it('does not strip a binding import from the global Tailwind stylesheet', () => {
    const source = `import styles from '@/unison/ui/tailwind.css';\nexport default function About(){ return <main>{String(styles)}</main>; }`;
    const healed = healKnownGeneratedUiImportMistakes({ '/src/pages/About.tsx': source });

    expect(healed).toEqual({ files: { '/src/pages/About.tsx': source }, healed: [] });
  });

  it('does not misread DOM TypeScript types as missing JSX components during preview prep', () => {
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': `import * as Dialog from '@/unison/ui/radix/dialog';
import { motion } from '@/unison/ui/animation';
import { z } from '@/unison/ui/zod';
import { Calendar } from '@/unison/ui/icons';
import { styles, typography } from '@/unison/ui/styles';
import { Textarea } from './unison/ui/form-fields';
export default function App(){ const schema = z.string(); void schema; return <Dialog.Root><motion.div className={styles(typography.body)}><Calendar aria-hidden /><Textarea aria-label="Message" /></motion.div></Dialog.Root>; }`,
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/form-fields.tsx']).not.toContain('./components/HTMLTextAreaElement');
    expect(prepared['/App.tsx']).toContain("'./unison/ui/radix/dialog'");
    expect(prepared['/App.tsx']).toContain("'./unison/ui/animation'");
    expect(prepared['/App.tsx']).toContain("'./unison/ui/zod'");
    expect(prepared['/App.tsx']).toContain("'./unison/ui/icons'");
    expect(prepared['/App.tsx']).toContain("'./unison/ui/styles'");
    expect(prepared['/unison/ui/radix/dialog.ts']).toContain("export * from '../../../radix-shim';");
    expect(prepared['/radix-shim.tsx']).toContain('export const Root = passthrough();');
    expect(prepared['/components/HTMLTextAreaElement.tsx']).toBeUndefined();
    expect(prepared['/unison/ui/icon.tsx']).not.toContain('./components/Glyph');
    expect(prepared['/components/Glyph.tsx']).toBeUndefined();
  });

  it('normalizes raw UI runtime imports to snapshot VFS facades', () => {
    const sanitized = sanitizeTsxFile('/src/pages/Experience.tsx', `import * as Dialog from '@radix-ui/react-dialog';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import 'tailwindcss/tailwind.css';
export default function Experience(){ const form = useForm({ resolver: zodResolver(z.object({})) }); return <Dialog.Root><motion.div><Calendar aria-hidden />{form.formState.isDirty ? 'ready' : 'waiting'}</motion.div></Dialog.Root>; }`);

    expect(sanitized.valid).toBe(true);
    expect(sanitized.applied).toContain('rewriteUnisonVfsImports');
    expect(sanitized.code).toContain("from '@/unison/ui/radix/dialog'");
    expect(sanitized.code).toContain("from '@/unison/ui/icons'");
    expect(sanitized.code).toContain("from '@/unison/ui/animation'");
    expect(sanitized.code).toContain("from '@/unison/ui/zod'");
    expect(sanitized.code).toContain("from '@/unison/ui/forms'");
    expect(sanitized.code).toContain("import '@/unison/ui/tailwind.css'");

    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': sanitized.code,
      '/src/index.css': `@import '@/unison/ui/tailwind.css';\n:root { --primary: 0 0% 10%; }`,
    }, { strict: true, entryPoint: '/src/App.tsx' });
    expect(prepared['/App.tsx']).toContain("import './unison/ui/tailwind.css'");
    expect(prepared['/index.css']).toContain("@import './unison/ui/tailwind.css'");
  });

  it('normalizes unsupported next/image components to native images', () => {
    const sanitized = sanitizeTsxFile('/src/pages/About.tsx', `import Image from 'next/image';
export default function About(){ return <main><Image src="/team.jpg" alt="Our team" width={1200} height={800} priority /></main>; }`);

    expect(sanitized.valid).toBe(true);
    expect(sanitized.applied).toContain('normalizeNextImage');
    expect(sanitized.code).not.toContain('next/image');
    expect(sanitized.code).toContain('<img');
    expect(sanitized.code).not.toContain('priority');
  });

  it('normalizes next/image imports that include named helpers', () => {
    const sanitized = sanitizeTsxFile('/src/pages/Gallery.tsx', `import Image, { type StaticImageData } from 'next/image';
export default function Gallery(){ const image: StaticImageData | string = '/gallery.jpg'; return <main><Image src={image} alt="Gallery highlight" fill /></main>; }`);

    expect(sanitized.valid).toBe(true);
    expect(sanitized.applied).toContain('normalizeNextImage');
    expect(sanitized.code).not.toContain('next/image');
    expect(sanitized.code).toContain('<img');
    expect(sanitized.code).not.toContain(' fill');
  });

  it('repairs Contact default and named component import mismatches before React renders', () => {
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': [
        "import { ContactForm } from '../components/ContactForm';",
        "import BusinessHours from '../components/BusinessHours';",
        "import { Mail, MapPin, Phone } from '@/unison/ui';",
        'export default function Contact(){',
        '  return <main><Mail /><MapPin /><Phone /><ContactForm /><BusinessHours /></main>;',
        '}',
      ].join('\n'),
      '/src/components/ContactForm.tsx': 'export default function ContactForm(){ return <form aria-label="Contact form" />; }',
      '/src/components/BusinessHours.tsx': 'export function BusinessHours(){ return <aside>Open today</aside>; }',
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/pages/Contact.tsx']).toContain("import ContactForm from '../components/ContactForm';");
    expect(prepared['/pages/Contact.tsx']).toContain("import { BusinessHours } from '../components/BusinessHours';");
    expect(prepared['/components/ContactForm.tsx']).not.toContain('export const ContactForm = ContactForm');
    expect(prepared['/unison/ui/index.ts']).toContain("export * from './icons';");
    expect(prepared['/unison/ui.tsx']).toBeUndefined();
  });

  it('supports generated Contact form field wrappers during strict VFS preflight', () => {
    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': "import { FormField, FormFields, Input } from '../unison/ui/form-fields'; export default function Contact(){ return <FormFields><FormField label='Email'><Input type='email' /></FormField></FormFields>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/pages/Contact.tsx']).toContain("import { FormField, FormFields, Input } from '../unison/ui/form-fields';");
    expect(prepared['/unison/ui/form-fields.tsx']).toContain('export function FormField');
    expect(prepared['/unison/ui/form-fields.tsx']).toContain('export function FormFields');
  });

  it('upgrades older form field facades before validating preserved Contact pages', () => {
    const legacyFoundation = {
      ...foundation.files,
      '/src/unison/ui/form-fields.tsx': foundation.files['/src/unison/ui/form-fields.tsx']
        .replace(/\ntype GeneratedFormFieldProps[\s\S]*?(?=\n\/\/ Alias surface:)/, ''),
      '/src/unison/ui/index.ts': foundation.files['/src/unison/ui/index.ts']
        .replace(', FormField, FormFields', ''),
    };
    const prepared = prepareSandpackFiles({
      ...legacyFoundation,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': "import { FormField, FormFields } from '../unison/ui/form-fields'; export default function Contact(){ return <FormFields><FormField>Message</FormField></FormFields>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/form-fields.tsx']).toContain('export function FormField');
    expect(prepared['/unison/ui/form-fields.tsx']).toContain('export function FormFields');
    expect(prepared['/unison/ui/index.ts']).toContain('FormField, FormFields');
  });

  it('upgrades an older generated UI root barrel before resolving Contact icons', () => {
    const legacyFiles = {
      ...foundation.files,
      '/src/unison/ui/index.ts': foundation.files['/src/unison/ui/index.ts'].replace("export * from './icons';\n", ''),
    };
    const prepared = prepareSandpackFiles({
      ...legacyFiles,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': "import { Mail, MapPin, Phone } from '@/unison/ui'; export default function Contact(){ return <main><Mail /><MapPin /><Phone /></main>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/index.ts']).toContain("export * from './icons';");
    expect(prepared['/unison/ui.tsx']).toBeUndefined();
  });

  it('surfaces the exact Contact import/export incompatibility before an undefined JSX render', () => {
    expect(() => prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': "import { ContactCard } from '../components/ContactParts'; export default function Contact(){ return <ContactCard />; }",
      '/src/components/ContactParts.tsx': 'export function Address(){ return <address />; } export function Hours(){ return <aside />; }',
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' })).toThrow(
      /Contact\.tsx imports JSX component "ContactCard".*does not export it.*Address, Hours/i,
    );
  });

  it('never splices the Lucide icon fallback shim into a dangling incomplete import statement', async () => {
    // Reproduces a real generated Contact.tsx: a truncated `import { ` left
    // over from an earlier repair pass, followed by raw Lucide icon usage
    // (MapPin, Phone) that never got a completed import. The auto-inject
    // pass used to anchor on `code.lastIndexOf('\nimport ')`, which matched
    // this dangling line and spliced `import * as __LucideIcons ...` into
    // the middle of it, producing `Unexpected keyword 'import'.`.
    const brokenContact = [
      "import { Label } from '../unison/ui/radix/label';",
      "import { ",
      'export default function Contact(){',
      '  return <main><MapPin /><Phone /></main>;',
      '}',
    ].join('\n');

    const prepared = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': brokenContact,
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    const contactSource = prepared['/pages/Contact.tsx'];
    expect(contactSource).toBeTruthy();
    expect(contactSource).not.toMatch(/import\s*\{\s*\n\s*import \* as __LucideIcons/);

    const Babel = (await import('@babel/standalone')) as unknown as {
      transform: (code: string, opts: Record<string, unknown>) => { code: string | null };
    };
    expect(() => Babel.transform(contactSource, {
      presets: [
        ['react', { runtime: 'classic' }],
        ['typescript', { isTSX: true, allExtensions: true }],
      ],
      filename: 'Contact.tsx',
      ast: false,
      code: false,
    })).not.toThrow();
  });

  it('is idempotent when a Live Business Data operation reintroduces a raw lucide-react import', () => {
    // Simulates the exact Unison sequence: prepareSandpackFiles() already
    // rewrote `import { MapPin, Phone } from 'lucide-react'` into namespace
    // lookups, then a catalog binding / AI patch / Playground recompile
    // reintroduces the plain named import into the ALREADY-prepared source
    // (e.g. because the binding operation regenerated the section from a
    // template that still uses raw lucide-react imports). Re-running
    // prepareSandpackFiles() on that file must not emit a second
    // `const MapPin = ...` declaration.
    const contactWithLucide = [
      "import { MapPin, Phone } from 'lucide-react';",
      'export default function Contact(){',
      '  return <main><MapPin /><Phone /></main>;',
      '}',
    ].join('\n');

    const once = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': contactWithLucide,
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    const onceContact = once['/pages/Contact.tsx'];
    const mapPinDeclCount = (onceContact.match(/const MapPin\s*=/g) || []).length;
    expect(mapPinDeclCount).toBe(1);

    // Reintroduce the raw named import into the already-prepared file, as a
    // catalog binding / AI patch regenerating the section would.
    const reintroduced = `import { MapPin } from 'lucide-react';\n${onceContact}`;

    const twice = prepareSandpackFiles({
      ...foundation.files,
      '/src/App.tsx': "import Contact from './pages/Contact'; export default function App(){ return <Contact />; }",
      '/src/pages/Contact.tsx': reintroduced,
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    const twiceContact = twice['/pages/Contact.tsx'];
    expect((twiceContact.match(/const MapPin\s*=/g) || []).length).toBe(1);
    expect(twiceContact).not.toMatch(/import\s*\{\s*MapPin\s*\}\s*from\s*['"]lucide-react['"]/);
  });
});
