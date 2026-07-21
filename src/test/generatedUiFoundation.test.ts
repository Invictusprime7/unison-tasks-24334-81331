import { describe, expect, it } from 'vitest';
import {
  buildGeneratedUiFoundation,
  readGeneratedUiManifest,
  validateGeneratedUiContract,
} from '@/platform/core/generatedUiFoundation';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
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
    expect(foundation.files['/src/unison/ui/navigation.tsx']).toContain("from './radix/dialog'");
    expect(foundation.files['/src/unison/ui/radix/dialog.ts']).toContain("@radix-ui/react-dialog");
    expect(foundation.files['/src/unison/ui/icon.tsx']).toContain('LucideIcon');
    expect(foundation.files['/src/unison/ui/motion.tsx']).toContain('useReducedMotion');
    expect(foundation.files['/src/unison/ui/index.ts']).toContain("export { Button } from './button';");
    expect(foundation.files['/src/unison/ui/icons.ts']).toContain("export * from 'lucide-react';");
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

  it('upgrades legacy wizard snapshots with missing facade files during preview preparation', () => {
    const legacyManifest = { ...foundation.manifest } as Record<string, unknown>;
    delete legacyManifest.runtimeFacades;
    const prepared = prepareSandpackFiles({
      '/.unison/ui-manifest.json': JSON.stringify(legacyManifest),
      '/src/App.tsx': "import { motion } from '@/unison/ui/animation'; export default function App(){ return <motion.main>Ready</motion.main>; }",
      '/src/index.css': ':root { --primary: 0 0% 10%; }',
    }, { strict: true, entryPoint: '/src/App.tsx' });

    expect(prepared['/unison/ui/animation.ts']).toContain("export * from 'framer-motion'");
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
    expect(prepared['/unison/ui/radix/dialog.ts']).toContain("@radix-ui/react-dialog");
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
});
