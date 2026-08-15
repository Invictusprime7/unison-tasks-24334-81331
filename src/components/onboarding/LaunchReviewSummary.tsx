/**
 * Lightweight, compile-free confirmation-dialog body for the Wizard launch
 * review step. Deliberately renders no Sandpack/VFSPreview instance — that
 * previously froze the decision modal. "Open Full Preview" hands the exact
 * generated files to the existing external-preview route instead.
 */
import { Check, ExternalLink } from "lucide-react";
import { createExternalPreviewSession } from "@/services/externalPreviewSession";

export interface LaunchReviewSummaryProps {
  siteName: string;
  brandName: string;
  fileCount: number;
  pagePaths: string[];
  files: Record<string, string>;
}

function isBrandingApplied(brandName: string, files: Record<string, string>): boolean {
  const needle = brandName.trim().toLowerCase();
  if (!needle) return true;
  return Object.values(files).some(
    (content) => typeof content === 'string' && content.toLowerCase().includes(needle),
  );
}

export function LaunchReviewSummary({ siteName, brandName, fileCount, pagePaths, files }: LaunchReviewSummaryProps) {
  const brandingApplied = isBrandingApplied(brandName, files);

  const openFullPreview = () => {
    const previewKey = createExternalPreviewSession(files, siteName);
    window.open(new URL(`/preview/${previewKey}`, window.location.origin), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid min-h-[320px] gap-6 border border-white/10 bg-black/35 p-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
      <div className="flex min-h-[240px] flex-col justify-between border border-white/10 bg-white/[0.025] p-6">
        <div>
          <div className="mb-5 flex h-10 w-10 items-center justify-center border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <Check className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-white">Generation complete</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
            The canonical site bundle, theme tokens, page routes, and intent bindings are ready. Live runtime compilation starts once in the Web Builder after confirmation, keeping this decision step responsive.
          </p>
          <button
            type="button"
            onClick={openFullPreview}
            className="mt-4 inline-flex items-center gap-1.5 border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Full Preview
          </button>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden border border-white/10 bg-white/10">
          <div className="bg-[#07080F] p-4">
            <p className="text-2xl font-semibold text-white">{pagePaths.length}</p>
            <p className="mt-1 text-xs text-white/45">Generated pages</p>
          </div>
          <div className="bg-[#07080F] p-4">
            <p className="text-2xl font-semibold text-white">{fileCount}</p>
            <p className="mt-1 text-xs text-white/45">Canonical files</p>
          </div>
          <div className="bg-[#07080F] p-4">
            <p className={`text-2xl font-semibold ${brandingApplied ? 'text-emerald-400' : 'text-amber-400'}`}>
              {brandingApplied ? '✓' : '!'}
            </p>
            <p className="mt-1 text-xs text-white/45">Branding check</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 border border-white/10 bg-white/[0.025] p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-white/45">Page routes</p>
        <div className="max-h-[250px] space-y-1 overflow-y-auto pr-1">
          {pagePaths.length > 0 ? pagePaths.map((path) => (
            <div key={path} className="truncate border border-white/[0.06] bg-black/25 px-3 py-2 font-mono text-xs text-white/65">
              {path.replace(/^\/?src\/pages\//i, '').replace(/\.tsx$/i, '')}
            </div>
          )) : (
            <p className="text-sm text-white/45">The home route is embedded in the canonical bundle.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LaunchReviewSummary;
