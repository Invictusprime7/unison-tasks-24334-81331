import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FolderPlus, Search, Grid, List, Star, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FileUploadDialog from "@/components/files/FileUploadDialog";
import FileGrid from "@/components/files/FileGrid";
import FileList from "@/components/files/FileList";
import FolderBreadcrumb from "@/components/files/FolderBreadcrumb";
import ShareDialog from "@/components/files/ShareDialog";
import FilePreviewDialog from "@/components/files/FilePreviewDialog";

const Files = () => {
  const navigate = useNavigate();
  const [currentFolder, setCurrentFolder] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const { toast } = useToast();

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ["files", currentFolder, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("files")
        .select(`
          *,
          shared_files(*)
        `)
        .eq("folder_path", currentFolder)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleCreateFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    const newPath = currentFolder === "/" 
      ? `/${folderName}` 
      : `${currentFolder}/${folderName}`;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create folders.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("files").insert({
      name: folderName,
      size: 0,
      mime_type: "folder",
      storage_path: "",
      folder_path: currentFolder,
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Folder created" });
      refetch();
    }
  };

  const handleFileClick = (file: any) => {
    if (file.mime_type === "folder") {
      const newPath = currentFolder === "/" 
        ? `/${file.name}` 
        : `${currentFolder}/${file.name}`;
      setCurrentFolder(newPath);
    } else {
      setSelectedFile(file);
      setPreviewDialogOpen(true);
    }
  };

  const handleShare = (file: any) => {
    setSelectedFile(file);
    setShareDialogOpen(true);
  };

  const handleToggleFavorite = async (file: any) => {
    const { error } = await supabase
      .from("files")
      .update({ is_favorite: !file.is_favorite })
      .eq("id", file.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
    } else {
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 
            className="text-4xl font-bold cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate("/")}
          >
            File Manager
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button variant="outline" onClick={handleCreateFolder}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>

        <FolderBreadcrumb
          currentFolder={currentFolder}
          onNavigate={setCurrentFolder}
        />

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={files || []}
            onFileClick={handleFileClick}
            onShare={handleShare}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <FileList
            files={files || []}
            onFileClick={handleFileClick}
            onShare={handleShare}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <FileUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          currentFolder={currentFolder}
          onUploadComplete={refetch}
        />

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          file={selectedFile}
          onShareComplete={refetch}
        />

        <FilePreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          file={selectedFile}
        />
      </div>
    </div>
  );
};

export default Files;
