/**
 * Code Preview Dialog
 * Shows generated HTML/CSS/JS code in a modal
 */

import React, { useState } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fabricCanvas: FabricCanvas | null;
}

export const CodePreviewDialog: React.FC<CodePreviewDialogProps> = ({
  isOpen,
  onClose,
  fabricCanvas
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    if (!fabricCanvas) return { html: '', css: '', js: '' };

    const objects = fabricCanvas.getObjects();
    let html = '<div class="web-page">\n';
    let css = '.web-page {\n  min-height: 100vh;\n  position: relative;\n  background: white;\n}\n\n';
    const js = '// Add your JavaScript here\n';

    objects.forEach((obj, index) => {
      const className = `element-${index}`;
      html += `  <div class="${className}"></div>\n`;
      
      css += `.${className} {\n`;
      css += `  position: absolute;\n`;
      css += `  left: ${obj.left}px;\n`;
      css += `  top: ${obj.top}px;\n`;
      css += `  width: ${(obj.width || 0) * (obj.scaleX || 1)}px;\n`;
      css += `  height: ${(obj.height || 0) * (obj.scaleY || 1)}px;\n`;
      if (obj.fill) css += `  background-color: ${obj.fill};\n`;
      css += `}\n\n`;
    });

    html += '</div>';

    return { html, css, js };
  };

  const { html, css, js } = generateCode();

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-slate-950 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Code Preview</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="html" className="w-full">
          <TabsList className="bg-slate-900">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="js">JavaScript</TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="mt-4">
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(html)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="bg-slate-900 p-4 rounded-lg overflow-auto max-h-[500px] text-slate-100 text-sm">
                <code>{html}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="css" className="mt-4">
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(css)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="bg-slate-900 p-4 rounded-lg overflow-auto max-h-[500px] text-slate-100 text-sm">
                <code>{css}</code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="js" className="mt-4">
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(js)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="bg-slate-900 p-4 rounded-lg overflow-auto max-h-[500px] text-slate-100 text-sm">
                <code>{js}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
