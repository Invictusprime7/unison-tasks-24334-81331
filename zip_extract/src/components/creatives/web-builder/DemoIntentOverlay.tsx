import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface DemoIntentOverlayConfig {
  intent: string;
  label?: string;
  url?: string;
}

interface DemoIntentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  config: DemoIntentOverlayConfig | null;
}

const DEFAULT_DEMO_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

function safeEmbedUrl(raw?: string): string {
  if (!raw) return DEFAULT_DEMO_URL;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return DEFAULT_DEMO_URL;
    return u.toString();
  } catch {
    return DEFAULT_DEMO_URL;
  }
}

export function DemoIntentOverlay({ isOpen, onClose, config }: DemoIntentOverlayProps) {
  const embedUrl = useMemo(() => safeEmbedUrl(config?.url), [config?.url]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{config?.label || "Watch demo"}</DialogTitle>
          <DialogDescription>
            Preview the site’s use case flow. (Tip: add <code>data-demo-url</code> / <code>data-supademo-url</code> to the button payload to customize.)
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={embedUrl}
              title="Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
