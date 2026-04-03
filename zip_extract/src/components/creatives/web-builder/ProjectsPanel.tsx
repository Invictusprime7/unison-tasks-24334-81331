import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, File, Save, Trash2, Clock, Search, Plus, MoreVertical, Edit2, Copy, HardDrive, Cloud, RefreshCw, Upload, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useTemplateFiles } from '@/hooks/useTemplateFiles';
import { cn } from '@/lib/utils';
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
import { Progress } from "@/components/ui/progress";
import JSZip from 'jszip';

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  canvas_data: {
    html: string;
    css?: string;
    js?: string;
    previewCode?: string;
  };
  is_public: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
}

interface ProjectsPanelProps {
  onLoadTemplate: (template: SavedTemplate) => void;
  onSaveTemplate: (name: string, description: string, isPublic?: boolean) => Promise<void>;
  currentCode: string;
}

const RECENT_TEMPLATES_KEY = 'webbuilder_recent_templates';
const MAX_RECENT = 5;

const getRecentTemplateIds = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToRecentTemplates = (id: string) => {
  const recent = getRecentTemplateIds().filter(r => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_TEMPLATES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

// Helper to read file as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// Helper to process ZIP files - reads all HTML, CSS, JS, and linked stylesheets
const processZipFile = async (file: File): Promise<{ html: string; css: string; js: string }> => {
  const zip = await JSZip.loadAsync(file);
  let html = '';
  let css = '';
  let js = '';
  const cssFiles: Record<string, string> = {};
  const jsFiles: Record<string, string> = {};

  // First pass: collect all files
  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const content = await zipEntry.async('string');
    const lowerName = filename.toLowerCase();
    const baseName = filename.split('/').pop() || filename;
    
    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      // Prefer index.html or take first HTML file
      if (!html || baseName.toLowerCase() === 'index.html') {
        html = content;
      }
    } else if (lowerName.endsWith('.css')) {
      cssFiles[baseName] = content;
      css += `/* === ${baseName} === */\n${content}\n\n`;
    } else if (lowerName.endsWith('.js') && !lowerName.includes('.min.')) {
      jsFiles[baseName] = content;
      js += `/* === ${baseName} === */\n${content}\n\n`;
    }
  }

  // Second pass: resolve linked CSS/JS in HTML
  if (html) {
    // Find all linked stylesheets
    const linkRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const cssPath = match[1].split('/').pop() || match[1];
      // CSS is already collected, just remove the link tag since we'll inline it
    }
    
    // Find all script sources
    const scriptRegex = /<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi;
    while ((match = scriptRegex.exec(html)) !== null) {
      const jsPath = match[1].split('/').pop() || match[1];
      // JS is already collected
    }
  }

  return { html, css: css.trim(), js: js.trim() };
};

// Helper to inject CSS/JS into HTML - creates complete document
const injectStylesAndScripts = (html: string, css: string, js: string): string => {
  let result = html;
  
  // Remove existing link tags for CSS files we're inlining
  result = result.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '');
  result = result.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, '');
  
  // Remove existing script src tags for JS files we're inlining
  result = result.replace(/<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>/gi, '');

  // Check if it's a full HTML document
  const isFullDoc = result.toLowerCase().includes('<!doctype') || result.toLowerCase().includes('<html');
  
  if (!isFullDoc) {
    // Wrap in complete HTML document
    result = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imported Template</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${css ? `<style>\n${css}\n</style>` : ''}
</head>
<body>
${result}
${js ? `<script>\n${js}\n</script>` : ''}
</body>
</html>`;
    return result;
  }

  // Inject CSS before </head>
  if (css) {
    const styleTag = `<style>\n${css}\n</style>`;
    if (result.includes('</head>')) {
      result = result.replace('</head>', `${styleTag}\n</head>`);
    } else if (result.toLowerCase().includes('<body')) {
      result = result.replace(/<body/i, `<head>${styleTag}</head>\n<body`);
    } else {
      // Insert after <html> tag
      result = result.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${styleTag}</head>`);
    }
  }

  // Inject JS before </body>
  if (js) {
    const scriptTag = `<script>\n${js}\n</script>`;
    if (result.includes('</body>')) {
      result = result.replace('</body>', `${scriptTag}\n</body>`);
    } else if (result.includes('</html>')) {
      result = result.replace('</html>', `${scriptTag}\n</html>`);
    } else {
      result = result + `\n${scriptTag}`;
    }
  }
  
  // Ensure Tailwind CSS is included
  if (!result.includes('tailwindcss') && !result.includes('tailwind.css')) {
    const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
    if (result.includes('</head>')) {
      result = result.replace('</head>', `${tailwindScript}\n</head>`);
    }
  }

  return result;
};

export const ProjectsPanel: React.FC<ProjectsPanelProps> = ({
  onLoadTemplate,
  onSaveTemplate,
  currentCode
}) => {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const hasFetched = useRef(false);
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getAllTemplates, deleteTemplate, saveTemplate, currentTemplateId } = useTemplateFiles();

  const fetchTemplates = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const allTemplates = await getAllTemplates();
      setTemplates(allTemplates);
      
      // Get recent templates
      const recentIds = getRecentTemplateIds();
      const recent = recentIds
        .map(id => allTemplates.find(t => t.id === id))
        .filter((t): t is SavedTemplate => t !== undefined);
      setRecentTemplates(recent);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  }, [getAllTemplates]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchTemplates();
    }
  }, [fetchTemplates]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileName = file.name.toLowerCase();
    
    // Validate file type
    const validExtensions = ['.html', '.htm', '.zip'];
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
      toast.error('Invalid file type', {
        description: 'Please upload an HTML file or ZIP archive containing HTML/CSS/JS files'
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(10);
    
    try {
      let finalHtml = '';
      let templateName = file.name.replace(/\.(html|htm|zip)$/i, '');
      
      if (fileName.endsWith('.zip')) {
        // Process ZIP file
        setUploadProgress(30);
        const { html, css, js } = await processZipFile(file);
        
        if (!html) {
          toast.error('No HTML file found in ZIP', {
            description: 'The ZIP archive must contain at least one HTML file'
          });
          setUploading(false);
          setUploadProgress(0);
          return;
        }
        
        setUploadProgress(60);
        finalHtml = injectStylesAndScripts(html, css, js);
      } else {
        // Process HTML file
        setUploadProgress(50);
        finalHtml = await readFileAsText(file);
      }
      
      setUploadProgress(80);
      
      // Create a temporary template object to load into canvas
      const uploadedTemplate: SavedTemplate = {
        id: `upload-${Date.now()}`,
        name: templateName,
        description: `Uploaded from ${file.name}`,
        canvas_data: {
          html: finalHtml,
          previewCode: finalHtml,
        },
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail_url: null,
      };
      
      setUploadProgress(100);
      
      // Load the template into canvas
      onLoadTemplate(uploadedTemplate);
      
      toast.success('File uploaded successfully!', {
        description: `"${templateName}" is now loaded in the canvas. Save it to keep your changes.`
      });
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      await onSaveTemplate(saveName, saveDescription);
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      hasFetched.current = false;
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (template: SavedTemplate) => {
    addToRecentTemplates(template.id);
    onLoadTemplate(template);
    // Update recent templates display
    const recentIds = getRecentTemplateIds();
    const recent = recentIds
      .map(id => templates.find(t => t.id === id))
      .filter((t): t is SavedTemplate => t !== undefined);
    setRecentTemplates(recent);
  };

  const handleDelete = async (template: SavedTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLocalTemplate = (id: string) => id.startsWith("local-");

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Header with Save Button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Projects</h3>
              <Button 
                size="sm" 
                onClick={() => setSaveDialogOpen(true)}
                className="h-7 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                Save Current
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Upload className="h-3 w-3" />
              Upload Project
            </div>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
                isDragOver 
                  ? "border-primary bg-primary/10" 
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.zip"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              
              {uploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-xs text-center text-muted-foreground">
                    Processing file...
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <FileCode className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-medium">
                    {isDragOver ? "Drop file here" : "Drop HTML/ZIP or click to upload"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Supports .html, .htm, and .zip files
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Templates */}
          {recentTemplates.length > 0 && !searchQuery && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              <div className="space-y-1">
                {recentTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className={cn(
                      "cursor-pointer hover:border-primary/50 transition-colors",
                      currentTemplateId === template.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleLoad(template)}
                  >
                    <CardContent className="p-2.5 flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted">
                        <File className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{template.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(template.updated_at), "MMM d")}
                        </p>
                      </div>
                      {isLocalTemplate(template.id) ? (
                        <HardDrive className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : (
                        <Cloud className="h-3 w-3 text-blue-500 shrink-0" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FolderOpen className="h-3 w-3" />
                All Templates ({filteredTemplates.length})
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  hasFetched.current = false;
                  fetchTemplates();
                }}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              </Button>
            </div>

            {loading && templates.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  {searchQuery ? "No templates found" : "No saved templates"}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 h-7 text-xs"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Save First Template
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className={cn(
                      "cursor-pointer group hover:border-primary/50 transition-colors",
                      currentTemplateId === template.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleLoad(template)}
                  >
                    <CardContent className="p-2.5 flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted">
                        <File className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{template.name}</p>
                          {currentTemplateId === template.id && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Open</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-[10px] text-muted-foreground truncate">{template.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(template.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isLocalTemplate(template.id) ? (
                          <HardDrive className="h-3 w-3 text-amber-500" />
                        ) : (
                          <Cloud className="h-3 w-3 text-blue-500" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleLoad(template);
                            }}>
                              <FolderOpen className="h-3 w-3 mr-2" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => handleDelete(template, e)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">💡 Tip</p>
            <p>Upload HTML or ZIP files to generate templates on the canvas. Templates are saved locally - sign in to sync across devices.</p>
          </div>
        </div>
      </ScrollArea>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">Save Template</DialogTitle>
            <DialogDescription className="text-xs">
              Save your current work as a reusable template
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs">Name *</Label>
              <Input
                id="name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Template"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                id="description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!saveName.trim() || saving}>
              {saving ? (
                <div className="animate-spin h-3 w-3 border-2 border-background border-t-transparent rounded-full mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
