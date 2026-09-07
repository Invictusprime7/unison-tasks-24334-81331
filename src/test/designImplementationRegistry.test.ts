import { describe, it, expect } from 'vitest';
import {
  listDesignImplementations,
  getDesignImplementation,
  isRegisteredImplementation,
  listImplementationsForSection,
  resolveImplementationId,
  designRegistrySignature,
} from '@/services/designImplementationRegistry';
import { VARIANT_REGISTRY } from '@/sections/variants';
import { getAllSections } from '@/sections/registry';
import type { SectionType } from '@/sections/types';

describe('canonical design implementation registry', () => {
  it('indexes every registered section family exactly once', () => {
    const families = new Set(listDesignImplementations().map((impl) => impl.sectionType));
    for (const type of Object.keys(getAllSections())) {
      expect(families.has(type as SectionType)).toBe(true);
    }
  });

  it('derives variant implementations from the variant registry without drift', () => {
    for (const [type, variants] of Object.entries(VARIANT_REGISTRY)) {
      for (const variant of variants ?? []) {
        const impl = getDesignImplementation(variant.id);
        expect(impl, `missing implementation for ${variant.id}`).toBeDefined();
        expect(impl?.sectionType).toBe(type);
        expect(impl?.slug).toBe(variant.slug);
      }
      expect(listImplementationsForSection(type as SectionType).length)
        .toBe((variants ?? []).length);
    }
  });

  it('gives variant-less families a generic identity', () => {
    const impl = getDesignImplementation('faq:generic');
    expect(impl?.hasVariants).toBe(false);
    expect(impl?.isDefault).toBe(true);
  });

  it('resolves identities only through registered entries', () => {
    expect(resolveImplementationId('hero', 'hero:split-image')).toBe('hero:split-image');
    expect(resolveImplementationId('hero', 'hero:not-real')).toBe('hero:generic');
    expect(isRegisteredImplementation('hero:not-real')).toBe(false);
  });

  it('produces a stable inventory signature', () => {
    expect(designRegistrySignature()).toBe(designRegistrySignature());
    expect(designRegistrySignature()).toMatch(/^dr_/);
  });
});
