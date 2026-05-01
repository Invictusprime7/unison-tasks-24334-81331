// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseLayoutIntent, applyClassEdit } from '@/utils/layoutIntentEngine';
import { executeLayoutIntent } from '@/utils/layoutIntentExecutor';
import { reorderSection } from '@/utils/sectionSwapper';

describe('layoutIntentEngine.parseLayoutIntent', () => {
  it('matches "center the hero" as a class-edit on the hero section', () => {
    const intent = parseLayoutIntent({ prompt: 'Center the hero in home' });
    expect(intent).not.toBeNull();
    expect(intent!.operation.kind).toBe('class-edit');
    expect(intent!.target.sectionType).toBe('hero');
    expect(intent!.target.explicit).toBe(true);
    if (intent!.operation.kind === 'class-edit') {
      expect(intent!.operation.add).toContain('mx-auto');
      expect(intent!.operation.add).toContain('text-center');
      expect(intent!.operation.remove).toContain('text-left');
    }
    expect(intent!.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('matches "move the cta upwards" as a section-reorder up', () => {
    const intent = parseLayoutIntent({ prompt: 'Move the CTA upwards' });
    expect(intent).not.toBeNull();
    expect(intent!.operation.kind).toBe('section-reorder');
    if (intent!.operation.kind === 'section-reorder') {
      expect(intent!.operation.targetSection).toBe('cta');
      expect(intent!.operation.direction).toBe('up');
    }
    expect(intent!.structural).toBe(true);
  });

  it('matches "put the testimonials before pricing" as anchored reorder', () => {
    const intent = parseLayoutIntent({ prompt: 'Put the testimonials before pricing' });
    expect(intent).not.toBeNull();
    expect(intent!.operation.kind).toBe('section-reorder');
    if (intent!.operation.kind === 'section-reorder') {
      expect(intent!.operation.targetSection).toBe('testimonials');
      expect(intent!.operation.anchorSection).toBe('pricing');
      expect(intent!.operation.position).toBe('before');
    }
  });

  it('treats vague "move it up" with selection as element-move', () => {
    const intent = parseLayoutIntent({
      prompt: 'move it up',
      selectionSelector: 'div > h1',
    });
    expect(intent?.operation.kind).toBe('element-move');
  });

  it('returns null for unrelated prompts', () => {
    expect(parseLayoutIntent({ prompt: 'Add a Stripe checkout flow' })).toBeNull();
  });

  it('returns null for class-edit without a target', () => {
    expect(parseLayoutIntent({ prompt: 'Center it' })).toBeNull();
  });

  it('uses the selection section when no explicit section is named', () => {
    const intent = parseLayoutIntent({
      prompt: 'Make this full width',
      selectionSelector: 'section:nth-of-type(2) > div',
      selectionSection: 'hero',
    });
    expect(intent?.operation.kind).toBe('class-edit');
    expect(intent?.target.sectionType).toBe('hero');
  });
});

describe('layoutIntentEngine.applyClassEdit', () => {
  it('adds new tokens and removes wildcard prefixes', () => {
    const out = applyClassEdit('text-left max-w-xl py-4', ['mx-auto', 'text-center'], ['text-left', 'max-w-*']);
    const tokens = new Set(out.split(/\s+/));
    expect(tokens.has('mx-auto')).toBe(true);
    expect(tokens.has('text-center')).toBe(true);
    expect(tokens.has('text-left')).toBe(false);
    expect(tokens.has('max-w-xl')).toBe(false);
    expect(tokens.has('py-4')).toBe(true);
  });

  it('is idempotent', () => {
    const a = applyClassEdit('mx-auto text-center', ['mx-auto'], []);
    expect(a.split(/\s+/).filter((t) => t === 'mx-auto').length).toBe(1);
  });
});

describe('sectionSwapper.reorderSection', () => {
  const code = `
const SECTIONS = [
  { "id": "n1", "type": "navbar", "props": {} },
  { "id": "h1", "type": "hero", "props": {} },
  { "id": "f1", "type": "features", "props": {} },
  { "id": "c1", "type": "cta", "props": {} },
  { "id": "ft1", "type": "footer", "props": {} }
];

// Section Map
`;

  it('moves a section up by direction', () => {
    const next = reorderSection(code, 'cta', { kind: 'direction', direction: 'up' });
    expect(next).not.toBeNull();
    // CTA should now appear before features
    const ctaIdx = next!.indexOf('"type": "cta"');
    const featIdx = next!.indexOf('"type": "features"');
    expect(ctaIdx).toBeLessThan(featIdx);
  });

  it('moves a section relative to an anchor', () => {
    const next = reorderSection(code, 'cta', { kind: 'anchor', anchor: 'hero', position: 'before' });
    expect(next).not.toBeNull();
    const ctaIdx = next!.indexOf('"type": "cta"');
    const heroIdx = next!.indexOf('"type": "hero"');
    expect(ctaIdx).toBeLessThan(heroIdx);
  });

  it('returns null when the section is already at the bottom and asked to move down', () => {
    const next = reorderSection(code, 'footer', { kind: 'direction', direction: 'down' });
    expect(next).toBeNull();
  });

  it('returns null for unknown sections', () => {
    const next = reorderSection(code, 'gallery', { kind: 'direction', direction: 'up' });
    expect(next).toBeNull();
  });
});

describe('layoutIntentExecutor.executeLayoutIntent (class-edit)', () => {
  const previewCode = `
const SECTIONS = [
  { "id": "h1", "type": "hero", "props": {} }
];
function Page() {
  return (
    <main>
      <section data-section="hero" className="text-left py-12">
        <h1 className="text-left">Title</h1>
      </section>
    </main>
  );
}
`;

  // Minimal bounds finder used in tests — finds the hero <section ...>...</section>
  const findBounds = (jsx: string, selector: string) => {
    if (selector !== 'section:nth-of-type(1)') return null;
    const open = jsx.indexOf('<section ');
    if (open === -1) return null;
    const close = jsx.indexOf('</section>', open);
    if (close === -1) return null;
    return { start: open, end: close + '</section>'.length };
  };

  it('applies center-classes to the hero section', () => {
    const intent = parseLayoutIntent({ prompt: 'Center the hero' })!;
    const result = executeLayoutIntent(intent, { previewCode, findBounds });
    expect(result.ok).toBe(true);
    expect(result.nextCode).toContain('mx-auto');
    expect(result.nextCode).toContain('text-center');
    expect(result.nextCode).not.toContain('text-left py-12'); // text-left removed
  });
});
