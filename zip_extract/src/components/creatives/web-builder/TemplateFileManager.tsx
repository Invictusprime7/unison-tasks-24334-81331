import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  FolderOpen, File, Save, Trash2, Clock, Search, 
  Plus, MoreVertical, Globe, Edit2, Copy, HardDrive, Cloud
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useTemplateFiles } from "@/hooks/useTemplateFiles";

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  canvas_data: {
    html?: string;
    css?: string;
    previewCode?: string;
  };
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
}

interface TemplateFileManagerProps {
  onLoadTemplate: (template: SavedTemplate) => void;
  onSaveTemplate: (name: string, description: string, isPublic: boolean) => Promise<void>;
  currentCode: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TemplateFileManager = ({
  onLoadTemplate,
  onSaveTemplate,
  currentCode,
  isOpen,
  onOpenChange,
}: TemplateFileManagerProps) => {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SavedTemplate | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveIsPublic, setSaveIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasFetched = useRef(false);

  const { getAllTemplates, updateTemplate, deleteTemplate, saveTemplate } = useTemplateFiles();

  const fetchTemplates = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const allTemplates = await getAllTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [getAllTemplates]);

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchTemplates();
    }
    if (!isOpen) {
      hasFetched.current = false;
    }
  }, [isOpen, fetchTemplates]);

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, currentCode);
      } else {
        await onSaveTemplate(saveName, saveDescription, saveIsPublic);
      }
      
      setSaveDialogOpen(false);
      setEditingTemplate(null);
      setSaveName("");
      setSaveDescription("");
      setSaveIsPublic(false);
      hasFetched.current = false;
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: SavedTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

    try {
      await deleteTemplate(template.id);
      hasFetched.current = false;
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleDuplicate = async (template: SavedTemplate) => {
    try {
      const code = template.canvas_data?.html || template.canvas_data?.previewCode || '';
      await saveTemplate(
        `${template.name} (Copy)`,
        template.description || '',
        false,
        code
      );
      toast.success("Template duplicated!");
      hasFetched.current = false;
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const openEditDialog = (template: SavedTemplate) => {
    setEditingTemplate(template);
    setSaveName(template.name);
    setSaveDescription(template.description || "");
    setSaveIsPublic(template.is_public);
    setSaveDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    setSaveName("");
    setSaveDescription("");
    setSaveIsPublic(false);
    setSaveDialogOpen(true);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLocalTemplate = (id: string) => id.startsWith("local-");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Template Files
            </DialogTitle>
            <DialogDescription>
              Save, open, and manage your web templates. No sign-in required for local storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={openNewDialog} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Current
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <File className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-center">
                    {searchQuery ? "No templates match your search" : "No saved templates yet"}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Save Your First Template
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer group"
                      onClick={() => {
                        onLoadTemplate(template);
                        onOpenChange(false);
                      }}
                    >
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                        <File className="h-6 w-6 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{template.name}</span>
                          {isLocalTemplate(template.id) ? (
                            <span title="Saved locally"><HardDrive className="h-3 w-3 text-amber-500" /></span>
                          ) : template.is_public ? (
                            <span title="Public"><Globe className="h-3 w-3 text-muted-foreground" /></span>
                          ) : (
                            <span title="Saved to cloud"><Cloud className="h-3 w-3 text-blue-500" /></span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(template.updated_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(template);
                          }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(template);
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Save Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Update template details and save changes" 
                : "Save your current work as a template"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Awesome Template"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="What does this template do?"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="public" className="text-muted-foreground">Make Public (requires sign in)</Label>
              <Switch
                id="public"
                checked={saveIsPublic}
                onCheckedChange={setSaveIsPublic}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!saveName.trim() || saving}>
              {saving ? (
                <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingTemplate ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
