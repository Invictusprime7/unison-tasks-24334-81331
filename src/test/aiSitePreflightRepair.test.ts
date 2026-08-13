import { describe, expect, it } from 'vitest';
import { runPreflightRepair } from '@/services/aiSitePreflightRepair';

describe('AI site preflight repair', () => {
  it('keeps a complete default-exported page when Lane B appends a trailing token', () => {
    const source = `
export default function Home() {
  return (
    <main>
      <section><h1>Artist portfolio</h1><p>Selected work and commissions.</p></section>
    </main>
  );
}
)
`;
    const repaired = runPreflightRepair({ '/src/pages/Home.tsx': source });

    expect(repaired.reports[0]).toMatchObject({ status: 'repaired' });
    expect(repaired.reports[0].passes).toContain('trim-parseable-trailing-suffix');
    expect(repaired.files['/src/pages/Home.tsx']).toContain('export default function Home');
    expect(repaired.files['/src/pages/Home.tsx']).not.toMatch(/\n\)\s*$/);
  });

  it('closes an unterminated block comment instead of quarantining the page', () => {
    const source = `
export default function Faq() {
  /* Frequently asked questions section
  return (
    <main>
      <section><h1>FAQ</h1><p>Answers to common questions.</p></section>
    </main>
  );
}
`;
    const repaired = runPreflightRepair({ '/src/pages/Faq.tsx': source });

    expect(repaired.reports[0]).toMatchObject({ status: 'repaired' });
    expect(repaired.reports[0].passes).toContain('close-unterminated-block-comment');
    expect(repaired.files['/src/pages/Faq.tsx']).toContain('export default function Faq');
    expect(repaired.files['/src/pages/Faq.tsx']).toContain('<h1>FAQ</h1>');
  });

  it('does not truncate a malformed page when no safe parseable prefix exists', () => {
    const repaired = runPreflightRepair({
      '/src/pages/Home.tsx': 'export default function Home() { return <main><h1>Portfolio</h1>',
    });

    expect(repaired.reports[0].status).toBe('quarantined');
  });
});