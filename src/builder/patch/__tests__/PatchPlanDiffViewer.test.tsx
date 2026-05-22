import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatchPlanDiffViewer } from '../PatchPlanDiffViewer';
import type { AIPatchTransactionState } from '../AIPatchTransactionService';
import type { PatchPlan } from '../types';

const plan: PatchPlan = {
  intent: 'modify_component',
  targetFiles: ['/src/a.tsx', '/src/b.tsx'],
  expectedSymbols: [],
  edits: [
    { kind: 'replace', path: '/src/a.tsx', content: 'new content' },
    {
      kind: 'edit',
      path: '/src/b.tsx',
      hunks: [
        { oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: [' ctx', '-old', '+new'] },
      ],
    },
  ],
  riskLevel: 'low',
  rationale: 'Tighten hero copy',
  promptHash: 'h',
};

const baseState = (overrides: Partial<AIPatchTransactionState> = {}): AIPatchTransactionState => ({
  phase: 'preview',
  plan,
  validationErrors: [],
  dryRun: { ok: true },
  apply: null,
  ...overrides,
});

describe('PatchPlanDiffViewer', () => {
  it('renders empty shell when no plan is present', () => {
    render(
      <PatchPlanDiffViewer
        state={{ phase: 'idle', plan: null, validationErrors: [], dryRun: null, apply: null }}
      />,
    );
    expect(screen.getByText(/no patch plan/i)).toBeInTheDocument();
  });

  it('renders rationale, intent, and every file in the tree', () => {
    render(<PatchPlanDiffViewer state={baseState()} originalFiles={{ '/src/a.tsx': 'old', '/src/b.tsx': 'ctx\nold' }} />);
    expect(screen.getByText(/tighten hero copy/i)).toBeInTheDocument();
    expect(screen.getByText('/src/a.tsx')).toBeInTheDocument();
    expect(screen.getByText('/src/b.tsx')).toBeInTheDocument();
    expect(screen.getByText('modify_component')).toBeInTheDocument();
  });

  it('enables Apply only in preview phase', () => {
    const onApply = vi.fn();
    const { rerender } = render(
      <PatchPlanDiffViewer state={baseState({ phase: 'dry-failed', dryRun: { ok: false, errors: ['x'] } })} onApply={onApply} />,
    );
    const apply = screen.getByRole('button', { name: /apply/i });
    expect(apply).toBeDisabled();

    rerender(<PatchPlanDiffViewer state={baseState()} onApply={onApply} />);
    const applyReady = screen.getByRole('button', { name: /apply/i });
    expect(applyReady).not.toBeDisabled();
    fireEvent.click(applyReady);
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('shows Retry only when dry-run/apply failed', () => {
    const onRetry = vi.fn();
    render(
      <PatchPlanDiffViewer
        state={baseState({ phase: 'dry-failed', dryRun: { ok: false, errors: ['need import'] } })}
        onRetry={onRetry}
      />,
    );
    const retry = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText(/need import/i)).toBeInTheDocument();
  });

  it('fires onDiscard from footer', () => {
    const onDiscard = vi.fn();
    render(<PatchPlanDiffViewer state={baseState()} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('switches active file when a tree entry is clicked', () => {
    render(<PatchPlanDiffViewer state={baseState()} originalFiles={{ '/src/a.tsx': 'old' }} />);
    // Default = first file (replace). Switch to edit file.
    fireEvent.click(screen.getByRole('button', { name: /\/src\/b\.tsx/i }));
    expect(screen.getByText(/edited file/i)).toBeInTheDocument();
  });
});
