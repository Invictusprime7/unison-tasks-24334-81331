/**
 * Quiet inline note rendered in the Web Builder when the launch run reached
 * handoff with degradations. The Wizard never toasts these — the journey always
 * completes, and the builder explains what was skipped.
 */
import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { consumeLaunchDegradations, type LaunchDegradation } from '@/services/launch/launchRun';

export function LaunchDegradationNote() {
  const [items, setItems] = useState<LaunchDegradation[]>([]);

  useEffect(() => {
    setItems(consumeLaunchDegradations());
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 left-1/2 z-50 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Your site is ready with a few steps skipped</p>
          <ul className="mt-1 space-y-1">
            {items.slice(0, 3).map((item) => (
              <li key={`${item.stage}-${item.code}-${item.at}`} className="text-xs text-muted-foreground">
                {item.message}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            You can regenerate any section from the AI panel at any time.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setItems([])}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default LaunchDegradationNote;
