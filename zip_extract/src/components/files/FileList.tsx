import { File, Folder, Star, Share2, Download, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";

interface FileListProps {
  files: any[];
  onFileClick: (file: any) => void;
  onShare: (file: any) => void;
  onToggleFavorite: (file: any) => void;
}

const FileList = ({ files, onFileClick, onShare, onToggleFavorite }: FileListProps) => {
  const { toast } = useToast();

  const handleDownload = async (file: any) => {
    const { data } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleDelete = async (file: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;

    if (file.mime_type !== "folder") {
      await supabase.storage.from("user-files").remove([file.storage_path]);
    }

    const { error } = await supabase.from("files").delete().eq("id", file.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "File deleted" });
      window.location.reload();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-4 p-3 hover:bg-muted rounded-lg cursor-pointer group"
          onClick={() => onFileClick(file)}
        >
          {file.mime_type === "folder" ? (
            <Folder className="h-5 w-5 text-primary" />
          ) : (
            <File className="h-5 w-5 text-muted-foreground" />
          )}
          
          {file.is_favorite && (
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {file.mime_type !== "folder" && `${formatFileSize(file.size)} • `}
              {formatDistance(new Date(file.created_at), new Date(), { addSuffix: true })}
            </p>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(file); }}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {file.mime_type !== "folder" && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(file); }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(file); }}>
                  <Star className={`h-4 w-4 mr-2 ${file.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  {file.is_favorite ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleDelete(file, e)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      {files.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No files found
        </div>
      )}
    </div>
  );
};

export default FileList;
