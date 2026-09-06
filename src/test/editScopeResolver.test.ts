import { describe, expect, it } from 'vitest';
import {
  buildScopedPromptPrefix,
  resolveEditScope,
  type ScopeAncestors,
} from '@/services/editScopeResolver';

describe('editScopeResolver artifact wiring (Stage 1)', () => {
  it('resolves the clicked artifact and its aiEditScope from artifactRegistry', () => {
    const ancestors: ScopeAncestors = {
      sectionId: 'section-1',
      sectionType: 'services',
      clickedTag: 'div',
    };
    const scope = resolveEditScope({ ancestors, selectedScope: 'section' });
    expect(scope.artifactId).toBe('services');
    expect(scope.aiEditScope).toBe('layout');
    expect(scope.aiEditable).toBe(true);
    // 'layout' scope is not content-capped, so an explicit section override survives.
    expect(scope.scopeType).toBe('section');
  });

  it('caps a content-only artifact down to block scope even when section/page is requested', () => {
    const ancestors: ScopeAncestors = {
      sectionId: 'nav-1',
      sectionType: 'navbar',
      clickedTag: 'nav',
    };
    const sectionScope = resolveEditScope({ ancestors, selectedScope: 'section' });
    expect(sectionScope.artifactId).toBe('navbar');
    expect(sectionScope.aiEditScope).toBe('content');
    expect(sectionScope.scopeType).toBe('block');

    const pageScope = resolveEditScope({ ancestors, selectedScope: 'page' });
    expect(pageScope.scopeType).toBe('block');
  });

  it('unions DOM-captured intents with the artifact\'s known intent bindings', () => {
    const ancestors: ScopeAncestors = {
      sectionId: 'footer-1',
      sectionType: 'footer',
      intents: ['contact.email'],
      clickedTag: 'footer',
    };
    const scope = resolveEditScope({ ancestors, selectedScope: 'block' });
    expect(scope.lockedBindings).toEqual(
      expect.arrayContaining(['contact.email', 'nav.goto', 'newsletter.subscribe', 'contact.call']),
    );
  });

  it('stays permissive for unknown/unmigrated section types', () => {
    const ancestors: ScopeAncestors = {
      sectionId: 'custom-1',
      sectionType: 'some-future-section',
      clickedTag: 'div',
    };
    const scope = resolveEditScope({ ancestors, selectedScope: 'page' });
    expect(scope.artifactId).toBeNull();
    expect(scope.aiEditScope).toBeNull();
    expect(scope.aiEditable).toBe(true);
    expect(scope.scopeType).toBe('page');
  });

  it('surfaces the artifact contract in the scoped AI prompt prefix', () => {
    const scope = resolveEditScope({
      ancestors: { sectionId: 'nav-1', sectionType: 'navbar', clickedTag: 'nav' },
      selectedScope: 'section',
    });
    const prefix = buildScopedPromptPrefix(scope);
    expect(prefix).toContain('Artifact: navbar (AI edit scope: content)');
    expect(prefix).toContain('This artifact only allows copy/imagery edits');
  });
});
