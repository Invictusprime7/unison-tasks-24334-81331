import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HTMLComponentPreviewProps {
  html: string;
  css: string;
  className?: string;
}

export const HTMLComponentPreview: React.FC<HTMLComponentPreviewProps> = ({
  html,
  css,
  className,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const renderContent = () => {
    if (!iframeRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!iframeDoc) {
        setError('Unable to access iframe document');
        setLoading(false);
        return;
      }

      const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #ffffff;
      padding: 20px;
    }
    ${css}
  </style>
  <script>
    // Error handling
    window.addEventListener('error', function(e) {
      console.error('Preview error:', e.error);
      document.body.innerHTML = '<div style="background: #fee; border: 1px solid #fcc; padding: 16px; border-radius: 8px; color: #c33; margin: 20px;"><strong>Error:</strong> ' + (e.error?.message || e.message) + '</div>';
    });
    
    // Prevent navigation
    window.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        e.preventDefault();
      }
    });
  </script>
</head>
<body>
  ${html}
</body>
</html>`;

      iframeDoc.open();
      iframeDoc.write(fullHTML);
      iframeDoc.close();

      setLoading(false);
    } catch (err) {
      console.error('Preview render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render preview');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add a small delay to ensure iframe is ready
    const timer = setTimeout(renderContent, 100);
    return () => clearTimeout(timer);
  }, [html, css]);

  const handleRefresh = () => {
    renderContent();
  };

  return (
    <div className={cn('relative w-full h-full bg-white', className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Rendering preview...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 right-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4 z-10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Preview Error</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Component Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};
