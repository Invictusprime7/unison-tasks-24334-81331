import { describe, expect, it } from 'vitest';
import { getCanonicalWizardSharedChrome } from '@/services/wizardSharedChrome';

describe('canonical wizard shared chrome', () => {
  it('restores the approved shared modules regardless of source path prefix', () => {
    expect(getCanonicalWizardSharedChrome('/src/sections/SiteNavbar.tsx'))
      .toContain('export default SiteNavbar');
    expect(getCanonicalWizardSharedChrome('/sections/SiteFooter.tsx'))
      .toContain('export default SiteFooter');
  });

  it('does not allow arbitrary shared modules to bypass the syntax gate', () => {
    expect(getCanonicalWizardSharedChrome('/src/sections/PromoBanner.tsx')).toBeNull();
    expect(getCanonicalWizardSharedChrome('/src/components/Runtime.tsx')).toBeNull();
  });
});