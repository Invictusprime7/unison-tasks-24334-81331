import { describe, expect, it } from 'vitest';
import { preflightNavWiring } from '@/services/preflightNavWiring';

function snapshot(pages: Record<string, { title: string; path: string; filePath?: string; isHome?: boolean; pageRole?: string }>) {
  return {
    pageRegistry: {
      homePageId: Object.entries(pages).find(([, p]) => p.isHome)?.[0] ?? Object.keys(pages)[0],
      pages: Object.fromEntries(
        Object.entries(pages).map(([id, p]) => [
          id,
          {
            pageId: id,
            title: p.title,
            path: p.path,
            filePath: p.filePath,
            isHome: !!p.isHome,
            pageType: 'custom',
            pageRole: p.pageRole,
          },
        ]),
      ),
    },
    bindings: {},
  } as any;
}

describe('preflightNavWiring', () => {
  it('binds buttons by label match to known page route', () => {
    const result = preflightNavWiring(
      {
        '/src/pages/Services.tsx':
          'export default function Services() { return <div><button>Contact Us</button><button>Book Now</button></div>; }',
      },
      snapshot({
        home: { title: 'Home', path: '/', isHome: true, filePath: '/src/App.tsx' },
        services: { title: 'Services', path: '/services', filePath: '/src/pages/Services.tsx', pageRole: 'services' },
        contact: { title: 'Contact', path: '/contact', filePath: '/src/pages/Contact.tsx', pageRole: 'contact' },
        booking: { title: 'Book Online', path: '/booking', filePath: '/src/pages/Booking.tsx', pageRole: 'booking' },
      }),
    );

    expect(result.wired).toBe(2);
    const out = result.files['/src/pages/Services.tsx'];
    expect(out).toContain('data-ut-intent="nav.goto"');
    expect(out).toContain('data-ut-target-page-id="contact"');
    expect(out).toContain('data-ut-target-page-id="booking"');
  });

  it('binds anchors by href to known route', () => {
    const result = preflightNavWiring(
      {
        '/src/App.tsx': 'export default function App() { return <a href="/shop">Browse</a>; }',
      },
      snapshot({
        home: { title: 'Home', path: '/', isHome: true, filePath: '/src/App.tsx' },
        shop: { title: 'Shop', path: '/shop', filePath: '/src/pages/Shop.tsx', pageRole: 'shop' },
      }),
    );
    expect(result.wired).toBe(1);
    expect(result.files['/src/App.tsx']).toContain('data-ut-target-page-id="shop"');
  });

  it('leaves elements already carrying data-ut-intent untouched', () => {
    const src = 'export default function P() { return <button data-ut-intent="cart.add">Contact</button>; }';
    const result = preflightNavWiring(
      { '/src/pages/P.tsx': src },
      snapshot({
        home: { title: 'Home', path: '/', isHome: true },
        contact: { title: 'Contact', path: '/contact', pageRole: 'contact' },
      }),
    );
    expect(result.wired).toBe(0);
    expect(result.files['/src/pages/P.tsx']).toBe(src);
  });

  it('is a no-op when registry has only one page', () => {
    const src = 'export default function P() { return <button>Anything</button>; }';
    const result = preflightNavWiring(
      { '/src/App.tsx': src },
      snapshot({ home: { title: 'Home', path: '/', isHome: true } }),
    );
    expect(result.wired).toBe(0);
    expect(result.files['/src/App.tsx']).toBe(src);
  });
});
