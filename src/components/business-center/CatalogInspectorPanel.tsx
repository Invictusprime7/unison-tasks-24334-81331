/**
 * CatalogInspectorPanel — Track B Builder surface.
 *
 * Lists every `site_data_binding` for the active project, shows the live row
 * count for each bound section, and calls out sections that block publish.
 * B4: bindings are inline-editable — pick collection, cap limit, sort.
 * B5: rows are inline-editable — edit name / description / price / image and
 * write back to the source table; the preview re-hydrates on save.
 */
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  evaluateCatalogReadinessGate,
  type CatalogGateVerdict,
} from '@/services/catalogReadinessGate';
import { listCollections } from '@/services/catalogCollectionService';
import { upsertBinding } from '@/services/sectionDataBindingService';
import {
  loadRowsForBinding,
  updateCatalogRow,
  createCatalogRow,
  deleteCatalogRow,
} from '@/services/catalogRowService';
import type {
  CatalogCollectionDTO,
  SectionDataBindingDTO,
} from '@/types/catalog';

interface CatalogInspectorPanelProps {
  projectId: string | null | undefined;
  sectionTypeMap?: Record<string, string>;
  onClose?: () => void;
  className?: string;
}

type RowRec = Record<string, unknown>;

interface RowDraft {
  name: string;
  description: string;
  price: string;
  image_url: string;
  saving: boolean;
  dirty: boolean;
}

interface DraftState {
  collectionId: string | null;
  limitCount: number | null;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  saving: boolean;
  collections: CatalogCollectionDTO[];
  loadedCollections: boolean;
  rows: RowRec[];
  loadedRows: boolean;
  rowDrafts: Record<string, RowDraft>;
}

function draftFromBinding(b: SectionDataBindingDTO): DraftState {
  return {
    collectionId: b.collectionId,
    limitCount: b.limitCount,
    sortField: b.sort?.field ?? '',
    sortDirection: b.sort?.direction ?? 'asc',
    saving: false,
    collections: [],
    loadedCollections: false,
    rows: [],
    loadedRows: false,
    rowDrafts: {},
  };
}

function toRowDraft(row: RowRec): RowDraft {
  return {
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    price: row.price != null ? String(row.price) : '',
    image_url: String(row.image_url ?? ''),
    saving: false,
    dirty: false,
  };
}


export function CatalogInspectorPanel({
  projectId,
  sectionTypeMap,
  onClose,
  className,
}: CatalogInspectorPanelProps) {
  const [verdict, setVerdict] = useState<CatalogGateVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setVerdict(null);
      return;
    }
    setLoading(true);
    evaluateCatalogReadinessGate(projectId, sectionTypeMap ?? {})
      .then((v) => {
        if (!cancelled) setVerdict(v);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, sectionTypeMap, reloadKey]);

  const loadRows = useCallback(async (binding: SectionDataBindingDTO) => {
    const result = await loadRowsForBinding(binding);
    const rowsArr = result.rows ?? [];
    const rowDrafts: Record<string, RowDraft> = {};
    for (const r of rowsArr) {
      const id = String(r.id ?? '');
      if (id) rowDrafts[id] = toRowDraft(r);
    }
    setDrafts((prev) => ({
      ...prev,
      [binding.id]: {
        ...(prev[binding.id] ?? draftFromBinding(binding)),
        rows: rowsArr,
        loadedRows: true,
        rowDrafts,
      },
    }));
  }, []);

  const toggleExpand = useCallback(
    async (binding: SectionDataBindingDTO) => {
      const isOpen = expanded === binding.id;
      if (isOpen) {
        setExpanded(null);
        return;
      }
      setExpanded(binding.id);
      setDrafts((prev) => ({
        ...prev,
        [binding.id]: prev[binding.id] ?? draftFromBinding(binding),
      }));
      const existing = drafts[binding.id];
      if (!existing?.loadedCollections) {
        const cols = await listCollections(binding.businessId, binding.sourceKind);
        setDrafts((prev) => ({
          ...prev,
          [binding.id]: {
            ...(prev[binding.id] ?? draftFromBinding(binding)),
            collections: cols,
            loadedCollections: true,
          },
        }));
      }
      if (!existing?.loadedRows) {
        void loadRows(binding);
      }
    },
    [expanded, drafts, loadRows],
  );

  const updateDraft = (id: string, patch: Partial<DraftState>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const updateRowDraft = (
    bindingId: string,
    rowId: string,
    patch: Partial<RowDraft>,
  ) => {
    setDrafts((prev) => {
      const d = prev[bindingId];
      if (!d) return prev;
      const current = d.rowDrafts[rowId];
      if (!current) return prev;
      return {
        ...prev,
        [bindingId]: {
          ...d,
          rowDrafts: {
            ...d.rowDrafts,
            [rowId]: { ...current, ...patch, dirty: true },
          },
        },
      };
    });
  };

  const bumpPreview = () => {
    try {
      window.postMessage({ type: 'CATALOG_BINDINGS_CHANGED', projectId }, '*');
    } catch { /* noop */ }
  };

  const saveRow = async (binding: SectionDataBindingDTO, rowId: string) => {
    const d = drafts[binding.id];
    const rd = d?.rowDrafts[rowId];
    if (!d || !rd) return;
    updateRowDraft(binding.id, rowId, { saving: true });
    const priceNum = rd.price.trim() === '' ? null : Number(rd.price);
    const ok = await updateCatalogRow(binding.sourceTable, rowId, {
      name: rd.name,
      description: rd.description || null,
      price: Number.isFinite(priceNum as number) ? (priceNum as number) : null,
      image_url: rd.image_url || null,
    });
    updateRowDraft(binding.id, rowId, { saving: false, dirty: !ok });
    if (ok) {
      await loadRows(binding);
      bumpPreview();
    }
  };

  const createRow = async (binding: SectionDataBindingDTO) => {
    updateDraft(binding.id, { saving: true });
    const created = await createCatalogRow(binding.sourceTable, binding.businessId, {
      name: 'New item',
      description: '',
      price: 0,
      image_url: '',
    });
    updateDraft(binding.id, { saving: false });
    if (created) {
      await loadRows(binding);
      bumpPreview();
    }
  };

  const removeRow = async (binding: SectionDataBindingDTO, rowId: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Delete this row? This cannot be undone.');
      if (!ok) return;
    }
    updateRowDraft(binding.id, rowId, { saving: true });
    const ok = await deleteCatalogRow(binding.sourceTable, rowId);
    if (ok) {
      await loadRows(binding);
      bumpPreview();
    } else {
      updateRowDraft(binding.id, rowId, { saving: false });
    }
  };

  const saveBinding = async (binding: SectionDataBindingDTO) => {
    const d = drafts[binding.id];
    if (!d) return;
    updateDraft(binding.id, { saving: true });
    await upsertBinding({
      businessId: binding.businessId,
      projectId: binding.projectId,
      snapshotId: binding.snapshotId,
      pagePath: binding.pagePath,
      sectionId: binding.sectionId,
      slotKey: binding.slotKey,
      bindingType: binding.bindingType,
      sourceKind: binding.sourceKind,
      sourceTable: binding.sourceTable,
      collectionId: d.collectionId,
      filters: binding.filters,
      sort: d.sortField ? { field: d.sortField, direction: d.sortDirection } : {},
      limitCount: d.limitCount,
      displayMapping: binding.displayMapping,
      fallbackMode: binding.fallbackMode,
    });
    updateDraft(binding.id, { saving: false });
    await loadRows(binding);
    setReloadKey((k) => k + 1);
    bumpPreview();
  };


  return (
    <div
      className={cn(
        'w-[380px] max-h-[75vh] overflow-auto rounded-lg border border-indigo-500/30 bg-zinc-950/95 backdrop-blur-md shadow-[0_0_25px_rgba(99,102,241,0.15)] text-zinc-200',
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Connected Data
          </span>
          {verdict && (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full border',
                verdict.publishBlocked
                  ? 'bg-red-500/10 text-red-300 border-red-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
              )}
            >
              {verdict.publishBlocked ? 'Publish blocked' : 'Ready'}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {loading && <div className="text-xs text-zinc-500">Loading bindings…</div>}
        {!loading && !projectId && (
          <div className="text-xs text-zinc-500">
            No project attached. Open a builder draft to inspect connected data.
          </div>
        )}
        {!loading && verdict && verdict.bindings.length === 0 && (
          <div className="text-xs text-zinc-500">
            No live-data sections bound yet. Generated sections will appear here when
            they connect to catalog rows.
          </div>
        )}

        {verdict?.bindings.map(({ binding, rowCount }) => {
          const blocked = verdict.reasons.some(
            (r) => r.pagePath === binding.pagePath && r.sectionId === binding.sectionId,
          );
          const soft = verdict.recommended.some(
            (r) => r.pagePath === binding.pagePath && r.sectionId === binding.sectionId,
          );
          const isOpen = expanded === binding.id;
          const draft = drafts[binding.id];
          return (
            <div
              key={binding.id}
              className={cn(
                'rounded-md border bg-zinc-900/60',
                blocked
                  ? 'border-red-500/40'
                  : soft
                    ? 'border-amber-500/30'
                    : 'border-zinc-800',
              )}
            >
              <button
                type="button"
                onClick={() => toggleExpand(binding)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-900/80 rounded-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-zinc-100 truncate">
                    {binding.pagePath} · {binding.sectionId}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full',
                      rowCount === 0
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-indigo-500/10 text-indigo-300',
                    )}
                  >
                    {rowCount} row{rowCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500 flex items-center gap-2">
                  <span>{binding.sourceKind}</span>
                  <span>·</span>
                  <span>{binding.sourceTable}</span>
                  {binding.collectionId && (
                    <>
                      <span>·</span>
                      <span>collection</span>
                    </>
                  )}
                  <span>·</span>
                  <span>fallback: {binding.fallbackMode}</span>
                  <span className="ml-auto text-indigo-400">{isOpen ? '▾' : '▸'}</span>
                </div>
              </button>

              {isOpen && draft && (
                <div className="px-3 pb-3 pt-1 border-t border-zinc-800/70 space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                    Collection
                  </label>
                  <select
                    value={draft.collectionId ?? ''}
                    onChange={(e) =>
                      updateDraft(binding.id, {
                        collectionId: e.target.value || null,
                      })
                    }
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                  >
                    <option value="">— All rows —</option>
                    {draft.collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                        Limit
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={draft.limitCount ?? ''}
                        onChange={(e) =>
                          updateDraft(binding.id, {
                            limitCount: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="none"
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                        Sort dir
                      </label>
                      <select
                        value={draft.sortDirection}
                        onChange={(e) =>
                          updateDraft(binding.id, {
                            sortDirection: e.target.value as 'asc' | 'desc',
                          })
                        }
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                      >
                        <option value="asc">asc</option>
                        <option value="desc">desc</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Sort field
                    </label>
                    <input
                      type="text"
                      value={draft.sortField}
                      onChange={(e) =>
                        updateDraft(binding.id, { sortField: e.target.value })
                      }
                      placeholder="e.g. sort_order, created_at"
                      className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={draft.saving}
                      onClick={() => saveBinding(binding)}
                      className="text-xs px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 disabled:opacity-50"
                    >
                      {draft.saving ? 'Saving…' : 'Save binding'}
                    </button>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/70">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Rows ({draft.rows.length})
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => createRow(binding)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-500/30"
                        >
                          + Add row
                        </button>
                        <button
                          type="button"
                          onClick={() => loadRows(binding)}
                          className="text-[10px] text-indigo-300 hover:text-indigo-200"
                        >
                          Reload
                        </button>
                      </div>
                    </div>
                    {!draft.loadedRows && (
                      <div className="text-[11px] text-zinc-500">Loading rows…</div>
                    )}
                    {draft.loadedRows && draft.rows.length === 0 && (
                      <div className="text-[11px] text-zinc-500">
                        No rows yet. Add items in the {binding.sourceTable} table.
                      </div>
                    )}
                    <div className="space-y-2">
                      {draft.rows.map((row) => {
                        const rowId = String(row.id ?? '');
                        const rd = draft.rowDrafts[rowId];
                        if (!rd) return null;
                        return (
                          <div
                            key={rowId}
                            className="rounded border border-zinc-800 bg-zinc-950/60 p-2 space-y-1"
                          >
                            <input
                              type="text"
                              value={rd.name}
                              onChange={(e) =>
                                updateRowDraft(binding.id, rowId, { name: e.target.value })
                              }
                              placeholder="Name"
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100"
                            />
                            <textarea
                              value={rd.description}
                              onChange={(e) =>
                                updateRowDraft(binding.id, rowId, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Description"
                              rows={2}
                              className="w-full text-[11px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300 resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={rd.price}
                                onChange={(e) =>
                                  updateRowDraft(binding.id, rowId, {
                                    price: e.target.value,
                                  })
                                }
                                placeholder="Price"
                                className="w-full text-[11px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                              />
                              <input
                                type="text"
                                value={rd.image_url}
                                onChange={(e) =>
                                  updateRowDraft(binding.id, rowId, {
                                    image_url: e.target.value,
                                  })
                                }
                                placeholder="Image URL"
                                className="w-full text-[11px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={rd.saving}
                                onClick={() => removeRow(binding, rowId)}
                                className="text-[11px] px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/30 disabled:opacity-40"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                disabled={rd.saving || !rd.dirty}
                                onClick={() => saveRow(binding, rowId)}
                                className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 disabled:opacity-40"
                              >
                                {rd.saving ? 'Saving…' : rd.dirty ? 'Save row' : 'Saved'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}

        {verdict && verdict.reasons.length > 0 && (
          <div className="mt-3 border-t border-red-500/20 pt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-red-300">
              Publish blockers
            </div>
            {verdict.reasons.map((r) => (
              <div key={r.code + r.sectionId} className="text-[11px] text-red-200">
                {r.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CatalogInspectorPanel;
