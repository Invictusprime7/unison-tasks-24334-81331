import { useState, useRef, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dynamic imports for heavy components
const DesignStudio = lazy(() => import("@/components/creatives/DesignStudio").then(m => ({ default: m.DesignStudio })));
const WebBuilder = lazy(() => import("@/components/creatives/WebBuilder").then(m => ({ default: m.WebBuilder })));
const FileBrowser = lazy(() => import("@/components/creatives/design-studio/FileBrowser").then(m => ({ default: m.FileBrowser })));

const DesignStudioPage = () => {
  const navigate = useNavigate();
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const designStudioRef = useRef<{ addImageFromUrl: (url: string) => void } | null>(null);
  const [activeTab, setActiveTab] = useState<"canvas" | "web">("canvas");

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      <header className="h-10 sm:h-12 border-b border-gray-200 bg-white flex items-center justify-between px-2 sm:px-4 shrink-0 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/creatives")}
            className="h-7 sm:h-8 px-2"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="text-sm sm:text-lg font-semibold truncate">Design Studio</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFileBrowserOpen(true)}
          className="h-7 sm:h-8 px-2 flex-shrink-0"
        >
          <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Browse Files</span>
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "canvas" | "web")} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-2 sm:mx-4 mt-1 sm:mt-2 w-fit h-8 flex-shrink-0">
          <TabsTrigger value="canvas" className="text-xs sm:text-sm h-7 px-2 sm:px-3">Canvas Studio</TabsTrigger>
          <TabsTrigger value="web" className="text-xs sm:text-sm h-7 px-2 sm:px-3">Web Builder</TabsTrigger>
        </TabsList>
        
        <TabsContent value="canvas" className="flex-1 mt-0 overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading Canvas Studio...</div>}>
            <DesignStudio ref={designStudioRef} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="web" className="flex-1 mt-0 overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading Web Builder...</div>}>
            <WebBuilder />
          </Suspense>
        </TabsContent>
      </Tabs>

      <Suspense fallback={null}>
        <FileBrowser 
          open={fileBrowserOpen} 
          onOpenChange={setFileBrowserOpen}
          onImageSelect={(imageUrl) => designStudioRef.current?.addImageFromUrl(imageUrl)}
        />
      </Suspense>
    </div>
  );
};

export default DesignStudioPage;
