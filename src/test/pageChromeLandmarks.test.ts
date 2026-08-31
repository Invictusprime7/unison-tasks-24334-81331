import { describe, it, expect } from 'vitest';
import { countPageChromeLandmarks } from '@/services/wizardSharedChrome';

describe('page chrome landmark counting', () => {
  it('counts the foundation navbar primitive as a navigation landmark', () => {
    const source = `
      import { FloatingNavbar } from '@/unison/ui';
      export default function Home() {
        return (<div><FloatingNavbar brand="Salon" links={[]} /><main /><footer /></div>);
      }
    `;
    expect(countPageChromeLandmarks(source)).toEqual({ navbars: 1, footers: 1 });
  });

  it('still flags competing chrome', () => {
    const source = '<FloatingNavbar /><nav /><footer /><SiteFooter />';
    expect(countPageChromeLandmarks(source)).toEqual({ navbars: 2, footers: 2 });
  });

  it('does not treat SectionHeader as navigation chrome', () => {
    expect(countPageChromeLandmarks('<SectionHeader title="x" />').navbars).toBe(0);
  });
});
