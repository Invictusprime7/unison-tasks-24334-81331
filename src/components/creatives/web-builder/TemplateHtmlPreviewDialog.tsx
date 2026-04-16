import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SecureIframePreview } from "@/components/SecureIframePreview";
import { sanitizeHTML } from "@/utils/htmlSanitizer";

interface TemplateHtmlPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  css: string;
  isRendering?: boolean;
  onConsole?: (type: string, args: any[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Legacy HTML preview for template-renderer workflows.
 * Kept isolated from the primary Sandpack/VFS preview path on purpose.
 */
export function TemplateHtmlPreviewDialog({
  open,
  onOpenChange,
  html,
  css,
  isRendering = false,
  onConsole,
  onError,
}: TemplateHtmlPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] backdrop-blur-2xl bg-gradient-to-b from-[#0d0d14]/98 to-[#0a0a0f]/98 border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-white/70" />
              Template HTML Preview
            </span>
            {isRendering && (
              <span className="text-xs text-white/40">Rendering...</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <SecureIframePreview
            html={sanitizeHTML(html)}
            css={css}
            className="w-full h-full border border-white/[0.08] rounded-xl bg-white"
            onConsole={onConsole}
            onError={onError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateHtmlPreviewDialog;
