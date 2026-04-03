import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bug, CheckCircle2, XCircle, Clock, Image } from 'lucide-react';
import { Template } from '@/schemas/templateSchema';

interface DebugInfo {
  parseResult: {
    success: boolean;
    errors?: string[];
    autoFilled?: string[];
  };
  layoutTiming?: {
    start: number;
    end: number;
    duration: number;
  };
  assets: {
    url: string;
    status: 'pending' | 'loaded' | 'failed';
    size?: { width: number; height: number };
  }[];
  template?: Template;
}

interface TemplateDebugPanelProps {
  debugInfo: DebugInfo | null;
  enabled: boolean;
}

export const TemplateDebugPanel = ({ debugInfo, enabled }: TemplateDebugPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!enabled || !debugInfo) {
    return null;
  }

  const { parseResult, layoutTiming, assets, template } = debugInfo;

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[600px] shadow-lg z-50 border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Template Debug
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </CardTitle>
      </CardHeader>
      
      {!collapsed && (
        <CardContent className="pt-0">
          <Tabs defaultValue="parse" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="parse" className="text-xs">Parse</TabsTrigger>
              <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
              <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
            </TabsList>

            <TabsContent value="parse" className="space-y-3">
              <div className="flex items-center gap-2">
                {parseResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {parseResult.success ? 'Valid' : 'Invalid'}
                </span>
              </div>

              {parseResult.errors && parseResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-500">Errors:</p>
                  <ScrollArea className="h-24 rounded border p-2">
                    {parseResult.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-500 mb-1">
                        • {error}
                      </p>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {parseResult.autoFilled && parseResult.autoFilled.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-yellow-600">Auto-filled fields:</p>
                  <ScrollArea className="h-24 rounded border p-2">
                    {parseResult.autoFilled.map((field, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground mb-1">
                        • {field}
                      </p>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {template && (
                <div className="text-xs space-y-1 p-2 bg-muted rounded">
                  <p><strong>Name:</strong> {template.name}</p>
                  <p><strong>Frames:</strong> {template.frames.length}</p>
                  <p><strong>Total Layers:</strong> {template.frames.reduce((acc, f) => acc + f.layers.length, 0)}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="layout" className="space-y-3">
              {layoutTiming ? (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      {layoutTiming.duration}ms
                    </span>
                  </div>
                  <div className="text-xs space-y-1 p-2 bg-muted rounded">
                    <p><strong>Start:</strong> {new Date(layoutTiming.start).toISOString()}</p>
                    <p><strong>End:</strong> {new Date(layoutTiming.end).toISOString()}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No layout timing available</p>
              )}

              {template?.frames.map((frame, idx) => (
                <div key={idx} className="text-xs p-2 border rounded space-y-1">
                  <p className="font-medium">{frame.name}</p>
                  <p><strong>Layout:</strong> {frame.layout}</p>
                  <p><strong>Size:</strong> {frame.width}×{frame.height}</p>
                  <p><strong>Layers:</strong> {frame.layers.length}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="assets" className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Image className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {assets.length} asset{assets.length !== 1 ? 's' : ''}
                </span>
              </div>

              <ScrollArea className="h-48">
                {assets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No assets to load</p>
                ) : (
                  <div className="space-y-2">
                    {assets.map((asset, idx) => (
                      <div key={idx} className="text-xs p-2 border rounded space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              asset.status === 'loaded' ? 'default' :
                              asset.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {asset.status}
                          </Badge>
                          {asset.size && (
                            <span className="text-muted-foreground">
                              {asset.size.width}×{asset.size.height}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-muted-foreground" title={asset.url}>
                          {asset.url}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};
