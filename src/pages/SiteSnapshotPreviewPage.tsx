/**
 * SiteSnapshotPreviewPage — standalone SiteBundleSnapshot previewer.
 * ---------------------------------------------------------------------------
 * Reads the canonical `siteBundleSnapshot` persisted on a builder draft and
 * renders it exactly as the snapshot declares it (VFS files + router + routes),
 * with a read-only ledger of what the snapshot contains: pages, routes,
 * bindings, theme tokens and provenance metadata.
 *
 * Read-only by design: this page never mutates the snapshot, so it is safe to
 * use as a pre-publish review surface.
 */

import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VFSPreview } from "@/components/VFSPreview";
import { StyleTokenCard } from "@/components/onboarding/StyleTokenCard";
import { THEME_PRESETS } from "@/components/onboarding/themePresets";
import { cn } from "@/lib/utils";
import { Loader2, Monitor, Smartphone, Tablet, RefreshCw, ArrowLeft } from "lucide-react";

type DraftRow = {
  id: string;
  name: string | null;
  updated_at: string;
  metadata: Record<string, any> | null;
  vfs_files: Record<string, string> | null;
};

type Device = "desktop" | "tablet" | "mobile";

const deviceOptions: Array<{ id: Device; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "desktop", icon: Monitor },
  { id: "tablet", icon: Tablet },
  { id: "mobile", icon: Smartphone },
];

export default function SiteSnapshotPreviewPage() {
  const { draftId: routeDraftId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [drafts, setDrafts] = React.useState<DraftRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [device, setDevice] = React.useState<Device>("desktop");
  const [reloadKey, setReloadKey] = React.useState(0);

  const selectedId = routeDraftId || searchParams.get("draft") || drafts[0]?.id || "";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to preview your saved site snapshots.");
        setDrafts([]);
        return;
      }
      const { data, error: qErr } = await supabase
        .from("builder_drafts")
        .select("id, name, updated_at, metadata, vfs_files")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (qErr) throw qErr;
      setDrafts((data || []) as unknown as DraftRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load snapshots.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const draft = drafts.find((d) => d.id === selectedId) ?? null;
  const snapshot = (draft?.metadata?.siteBundleSnapshot ?? null) as Record<string, any> | null;

  const files = React.useMemo<Record<string, string>>(() => {
    if (!snapshot) return {};
    const base = { ...((snapshot.vfsFiles || {}) as Record<string, string>) };
    const router = snapshot.routerFile as { path?: string; content?: string } | undefined;
    if (router?.path && router?.content) base[router.path] = router.content;
    return base;
  }, [snapshot]);

  const pages = React.useMemo(() => {
    const registryPages = snapshot?.pageRegistry?.pages;
    if (Array.isArray(registryPages)) return registryPages as Array<Record<string, any>>;
    if (registryPages && typeof registryPages === "object") {
      return Object.values(registryPages) as Array<Record<string, any>>;
    }
    return [];
  }, [snapshot]);

  const themePresetId: string | undefined =
    snapshot?.meta?.themePresetId ?? draft?.metadata?.themePresetId;
  const themePreset = THEME_PRESETS.find((t) => t.id === themePresetId) ?? null;

  const selectDraft = (id: string) => {
    if (routeDraftId) navigate(`/site-preview/${id}`);
    else setSearchParams({ draft: id });
  };

  return (
    <main className="flex h-dvh w-full flex-col bg-zinc-950 text-zinc-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <button
          type="button"
          onClick={() => navigate("/web-builder")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/60 hover:text-white/90"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Builder
        </button>
        <h1 className="text-sm font-semibold">Snapshot previewer</h1>

        <select
          value={selectedId}
          onChange={(e) => selectDraft(e.target.value)}
          className="ml-auto min-w-[14rem] rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/80 outline-none"
          aria-label="Select a saved site snapshot"
        >
          {drafts.length === 0 && <option value="">No saved snapshots</option>}
          {drafts.map((d) => (
            <option key={d.id} value={d.id} className="bg-zinc-900">
              {d.metadata?.name || d.name || "Untitled project"} ·{" "}
              {new Date(d.updated_at).toLocaleDateString()}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] p-0.5">
          {deviceOptions.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              aria-label={`${id} preview`}
              className={cn(
                "rounded-md p-1.5 text-white/50 transition-colors",
                device === id && "bg-white/[0.08] text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            void load();
            setReloadKey((k) => k + 1);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/60 hover:text-white/90"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Snapshot ledger */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-white/[0.06] p-3 lg:block">
          {snapshot ? (
            <div className="space-y-4">
              <section className="space-y-1.5">
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Identity
                </h2>
                <dl className="space-y-1 text-[11px]">
                  {[
                    ["Business", snapshot.businessName],
                    ["Industry", snapshot.industry],
                    ["Source", snapshot.meta?.source],
                    ["Snapshot", String(snapshot.snapshotId || "").slice(0, 12)],
                    ["Created", snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : "—"],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-2">
                      <dt className="text-white/35">{k}</dt>
                      <dd className="truncate text-white/70">{(v as string) || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Pages ({pages.length})
                </h2>
                <ul className="space-y-1">
                  {pages.map((p, i) => (
                    <li
                      key={(p.id as string) || (p.path as string) || i}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px]"
                    >
                      <span className="truncate text-white/70">{p.name || p.title || p.slug || p.path}</span>
                      <span className="font-mono text-[9px] text-white/35">{p.route || p.path}</span>
                    </li>
                  ))}
                  {pages.length === 0 && (
                    <li className="text-[11px] text-white/35">No pages declared.</li>
                  )}
                </ul>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Wiring
                </h2>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-white/50">
                  <span className="rounded-md border border-white/[0.06] px-1.5 py-1">
                    {Object.keys(snapshot.bindings || {}).length} bindings
                  </span>
                  <span className="rounded-md border border-white/[0.06] px-1.5 py-1">
                    {Object.keys(files).length} files
                  </span>
                  <span className="rounded-md border border-white/[0.06] px-1.5 py-1">
                    {(snapshot.routes || []).length} routes
                  </span>
                  <span className="rounded-md border border-white/[0.06] px-1.5 py-1">
                    home {snapshot.homeRoute || "/"}
                  </span>
                </div>
              </section>

              {themePreset && (
                <section className="space-y-1.5">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Aesthetic tokens
                  </h2>
                  <StyleTokenCard
                    theme={themePreset}
                    businessName={snapshot.businessName}
                    showTokenLedger={false}
                  />
                </section>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-white/35">
              {loading ? "Loading snapshots…" : "This draft has no SiteBundleSnapshot yet."}
            </p>
          )}
        </aside>

        {/* Preview surface */}
        <div className="min-w-0 flex-1 bg-black/40">
          {loading ? (
            <div className="flex h-full items-center justify-center text-white/40">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading snapshot…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/50">
              {error}
            </div>
          ) : !snapshot || Object.keys(files).length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/50">
              No canonical snapshot to render. Generate or save a site first — the
              previewer only renders what the SiteBundleSnapshot declares.
            </div>
          ) : (
            <VFSPreview
              key={`${selectedId}-${reloadKey}`}
              nodes={[]}
              files={files}
              device={device}
              className="!h-full !w-full !rounded-none !border-0"
              showToolbar={false}
              autoStart={false}
              forceBackend="sandpack"
              showBackendIndicator={false}
            />
          )}
        </div>
      </div>
    </main>
  );
}
