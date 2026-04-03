import { File, Folder, Star, Share2, Download, Trash2, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
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

interface FileGridProps {
  files: any[];
  onFileClick: (file: any) => void;
  onShare: (file: any) => void;
  onToggleFavorite: (file: any) => void;
}

const FileGrid = ({ files, onFileClick, onShare, onToggleFavorite }: FileGridProps) => {
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "folder") return <Folder className="h-12 w-12 text-primary" />;
    return <File className="h-12 w-12 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => (
        <Card
          key={file.id}
          className="p-4 hover:shadow-lg transition-shadow cursor-pointer relative group"
          onClick={() => onFileClick(file)}
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

          {file.is_favorite && (
            <Star className="absolute top-2 left-2 h-5 w-5 fill-yellow-500 text-yellow-500" />
          )}

          <div className="flex flex-col items-center space-y-2">
            {getFileIcon(file.mime_type)}
            <div className="text-center w-full">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {file.mime_type !== "folder" && formatFileSize(file.size)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistance(new Date(file.created_at), new Date(), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Card>
      ))}

      {files.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          No files found
        </div>
      )}
    </div>
  );
};

export default FileGrid;
