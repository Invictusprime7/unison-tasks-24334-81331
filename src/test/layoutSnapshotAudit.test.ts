import { describe, it, expect } from 'vitest';
import { auditLayoutSource, auditPageLayouts, summarizeLayoutSnapshots } from '@/services/layoutSnapshotAudit';

const GOOD = `export default function Home(){return (<section className="py-16"><div className="container mx-auto"><div className="grid grid-cols-3 gap-6">{items.map((i)=>(<Card key={i.id}/>))}</div></div></section>);}`;
const LEFT_GLUED = `export default function Home(){return (<div className="grid grid-cols-3 gap-6">
<Stagger className="space-y-4">
{items.map((i)=>(<Card key={i.id}/>))}
</Stagger>
</div>);}`;

describe('layoutSnapshotAudit', () => {
  it('passes a contained, gapped, repeated grid', () => {
    const snap = auditLayoutSource('/src/pages/Home.tsx', GOOD);
    expect(snap.hasBlockingIssue).toBe(false);
    expect(snap.blocks[0].columns).toBe(3);
  });

  it('flags a transparent wrapper as the only grid child', () => {
    const snap = auditLayoutSource('/src/pages/Home.tsx', LEFT_GLUED);
    expect(snap.issues.some((i) => i.code === 'transparent-wrapper-child')).toBe(true);
    expect(snap.hasBlockingIssue).toBe(true);
  });

  it('flags uncontained sections', () => {
    const snap = auditLayoutSource('/src/pages/About.tsx', `<div className="grid grid-cols-2 gap-4">{a.map(x=><i/>)}</div>`);
    expect(snap.issues.some((i) => i.code === 'uncontained-section')).toBe(true);
  });

  it('flags grids without gaps', () => {
    const snap = auditLayoutSource('/src/pages/A.tsx', `<div className="container mx-auto"><div className="grid grid-cols-2">{a.map(x=><i/>)}</div></div>`);
    expect(snap.issues.some((i) => i.code === 'grid-without-gap')).toBe(true);
  });

  it('audits every page file and summarizes', () => {
    const snaps = auditPageLayouts({ '/src/pages/Home.tsx': GOOD, '/src/pages/Services.tsx': LEFT_GLUED, '/src/App.tsx': GOOD });
    expect(snaps.map((s) => s.name)).toEqual(['Home', 'Services']);
    const summary = summarizeLayoutSnapshots(snaps);
    expect(summary.pages).toBe(2);
    expect(summary.publishSafe).toBe(false);
  });
});
