/**
 * LaunchGateNotice — calm, branded launch-gate UI shown when a launcher-backed
 * draft is missing its canonical SiteBundleSnapshot.
 *
 * This is NOT an error screen. It is a launch gate. No red chrome, no scary
 * iconography. The user sees a clear next step: run the System Launcher.
 */
import { Rocket, RotateCw, ChevronRight } from 'lucide-react';
import type { CanonicalRuntimeError } from '@/platform/core/canonicalRuntimeContract';

interface LaunchGateNoticeProps {
  error: CanonicalRuntimeError;
  onRunLauncher?: () => void;
  onMigrateLegacy?: () => void;
}

const SURFACE_LABEL: Record<string, string> = {
  preview: 'Preview',
  readiness: 'Readiness Center',
  publish: 'Publish',
  artifacts: 'Build artifacts',
  deploy: 'Deploy',
};

export function LaunchGateNotice({
  error,
  onRunLauncher,
  onMigrateLegacy,
}: LaunchGateNoticeProps) {
  const { surface, code, userMessage, developerMessage, recoveryActions } = error.canonical;
  const canMigrate = recoveryActions.includes('migrate-legacy-draft') && Boolean(onMigrateLegacy);

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        <div className="border-b border-zinc-800/80 bg-zinc-900/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              Launch gate
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {SURFACE_LABEL[surface] ?? surface}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-zinc-50">
            This project has not been launched yet
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-zinc-300">
            {userMessage}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {onRunLauncher && (
              <button
                onClick={onRunLauncher}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-400"
              >
                <Rocket className="h-3.5 w-3.5" />
                Run System Launcher
                <ChevronRight className="h-3.5 w-3.5 opacity-80" />
              </button>
            )}
            {canMigrate && (
              <button
                onClick={onMigrateLegacy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Migrate legacy draft
              </button>
            )}
          </div>

          <details className="mt-5 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-400">
            <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Details
            </summary>
            <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-zinc-400">
              <div>
                <span className="text-zinc-500">code</span> {code}
              </div>
              <div>
                <span className="text-zinc-500">surface</span> {surface}
              </div>
              <div className="break-words">
                <span className="text-zinc-500">developer</span> {developerMessage}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
