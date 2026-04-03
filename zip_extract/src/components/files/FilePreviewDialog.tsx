import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: any;
}

const FilePreviewDialog = ({ open, onOpenChange, file }: FilePreviewDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file || !open) {
      setPreviewUrl(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      const { data } = await supabase.storage
        .from("user-files")
        .createSignedUrl(file.storage_path, 300);

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
      setLoading(false);
    };

    loadPreview();
  }, [file, open]);

  const renderPreview = () => {
    if (!file || loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (file.mime_type.startsWith("image/")) {
      return (
        <img
          src={previewUrl || ""}
          alt={file.name}
          className="max-w-full max-h-[70vh] mx-auto rounded"
        />
      );
    }

    if (file.mime_type === "application/pdf") {
      return (
        <iframe
          src={previewUrl || ""}
          className="w-full h-[70vh] rounded"
          title={file.name}
        />
      );
    }

    if (file.mime_type.startsWith("text/")) {
      return (
        <iframe
          src={previewUrl || ""}
          className="w-full h-96 rounded border"
          title={file.name}
        />
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Preview not available for this file type</p>
        <a
          href={previewUrl || ""}
          download={file.name}
          className="text-primary hover:underline mt-4 inline-block"
        >
          Download to view
        </a>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{file?.name}</DialogTitle>
        </DialogHeader>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
