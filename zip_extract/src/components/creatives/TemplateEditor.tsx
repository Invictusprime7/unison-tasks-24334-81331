import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Code, Eye, Copy, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNavigate } from "react-router-dom";

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  aesthetic: string;
  generatedCode: string;
  onBack: () => void;
}

export const TemplateEditor = ({
  open,
  onOpenChange,
  templateName,
  aesthetic,
  generatedCode,
  onBack,
}: TemplateEditorProps) => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [code, setCode] = useState(generatedCode);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setCode(generatedCode);
  }, [generatedCode]);

  useEffect(() => {
    if (iframeRef.current && code) {
      const iframe = iframeRef.current;
      
      // Wait for iframe to be ready
      const updateIframe = () => {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(code);
          iframeDoc.close();
        }
      };

      // If iframe is already loaded, update immediately
      if (iframe.contentDocument?.readyState === 'complete') {
        updateIframe();
      } else {
        // Otherwise wait for load
        iframe.onload = updateIframe;
      }
    }
  }, [code]);

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName.toLowerCase().replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const handleRefreshPreview = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(code);
        iframeDoc.close();
      }
    }
    toast.success("Preview refreshed!");
  };

  const handleBuild = () => {
    navigate("/design-studio", {
      state: {
        templateCode: code,
        templateName,
        aesthetic,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] max-h-[100vh] sm:max-h-[95vh] h-[100vh] sm:h-[95vh] overflow-hidden flex flex-col p-2 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle className="text-lg sm:text-2xl">{templateName}</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{aesthetic}</p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              <Button variant="default" size="sm" onClick={handleBuild} className="text-xs sm:text-sm h-8 sm:h-9">
                <Wrench className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Build</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyCode} className="text-xs sm:text-sm h-8 sm:h-9">
                <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Copy Code</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefreshPreview} className="text-xs sm:text-sm h-8 sm:h-9">
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs sm:text-sm h-8 sm:h-9">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 w-full sm:w-auto">
            <TabsTrigger value="preview" className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
              <Code className="h-3 w-3 sm:h-4 sm:w-4" />
              Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="flex-1 mt-2 sm:mt-4 overflow-hidden">
            <div className="h-full border rounded-lg overflow-hidden bg-white shadow-lg">
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                title="Template Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
                style={{ border: 'none', minHeight: '300px' }}
              />
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 mt-2 sm:mt-4 overflow-hidden">
            <div className="h-full border rounded-lg overflow-hidden bg-[#1e1e1e] relative">
              {!isEditing ? (
                <>
                  <div className="absolute top-2 right-2 z-10">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                      className="text-xs h-7 sm:h-8"
                    >
                      <Code className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </div>
                  <SyntaxHighlighter
                    language="html"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      height: '100%',
                      fontSize: '11px',
                      lineHeight: '1.5',
                    }}
                    className="sm:text-sm"
                    showLineNumbers
                    wrapLines
                  >
                    {code}
                  </SyntaxHighlighter>
                </>
              ) : (
                <>
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                      className="text-xs h-7 sm:h-8"
                    >
                      <Eye className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Preview</span>
                    </Button>
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full p-2 sm:p-4 font-mono text-xs sm:text-sm bg-[#1e1e1e] text-slate-50 resize-none focus:outline-none"
                    spellCheck={false}
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
