import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Maximize2, Monitor, Tablet, Smartphone, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPreviewURL, revokePreviewURL, isPreviewableCode } from '@/utils/codeRunner';
import { useToast } from '@/hooks/use-toast';

interface LiveCodePreviewProps {
  code: string;
  className?: string;
  autoRefresh?: boolean;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const LiveCodePreview: React.FC<LiveCodePreviewProps> = ({
  code,
  className,
  autoRefresh = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const deviceSizes = {
    desktop: { width: '100%', height: '100%', label: 'Desktop' },
    tablet: { width: '768px', height: '1024px', label: 'Tablet' },
    mobile: { width: '375px', height: '667px', label: 'Mobile' },
  };

  const refreshPreview = () => {
    console.log('[LiveCodePreview] Refreshing preview with code:', code.substring(0, 100));
    
    setError(null);
    
    if (!code || !code.trim()) {
      setError('No code to preview');
      return;
    }

    if (!isPreviewableCode(code)) {
      setError('Code does not appear to contain HTML, CSS, or React components');
      return;
    }

    setIsLoading(true);
    
    try {
      // Cleanup old URL
      if (previewUrl) {
        revokePreviewURL(previewUrl);
      }

      // Create new preview
      const url = createPreviewURL(code);
      console.log('[LiveCodePreview] Created preview URL:', url);
      setPreviewUrl(url);
      
      toast({
        title: 'Preview updated',
        description: 'Live preview refreshed successfully',
      });
    } catch (err) {
      console.error('[LiveCodePreview] Error creating preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to create preview');
      toast({
        title: 'Preview failed',
        description: 'Could not generate preview',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh when code changes
  useEffect(() => {
    if (autoRefresh && code) {
      const timer = setTimeout(() => {
        refreshPreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [code, autoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokePreviewURL(previewUrl);
      }
    };
  }, []);

  const handleIframeLoad = () => {
    console.log('[LiveCodePreview] Iframe loaded');
    setIsLoading(false);
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen?.();
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant={device === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDevice('desktop')}
            className="h-8"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={device === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDevice('tablet')}
            className="h-8"
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={device === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDevice('mobile')}
            className="h-8"
          >
            <Smartphone className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <span className="text-xs text-muted-foreground">
            {deviceSizes[device].label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
            disabled={isLoading}
            className="h-8"
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="h-8"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-muted/10 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Preview Error</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshPreview} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : !previewUrl ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">No Preview Available</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add some code to see the live preview
              </p>
            </div>
          </div>
        ) : (
          <div
            className="bg-white rounded-lg shadow-lg transition-all duration-300"
            style={{
              width: deviceSizes[device].width,
              height: deviceSizes[device].height,
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full rounded-lg border-2 border-border"
              sandbox="allow-scripts allow-same-origin"
              title="Live Code Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
};
