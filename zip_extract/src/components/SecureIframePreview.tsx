import { useEffect, useRef, useState } from 'react';
import { RPCHost } from '@/utils/rpc';
import { VirtualFilesystem } from '@/utils/vfs';
import { createSecureHTML } from '@/utils/htmlSanitizer';

interface SecureIframePreviewProps {
  html?: string;
  css?: string;
  className?: string;
  onConsole?: (type: string, args: any[]) => void;
  onError?: (error: Error) => void;
}

export function SecureIframePreview({ 
  html = '', 
  css = '', 
  className = '',
  onConsole,
  onError 
}: SecureIframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rpcRef = useRef<RPCHost | null>(null);
  const vfsRef = useRef<VirtualFilesystem | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize VFS and RPC - constructors don't need arguments
    if (!vfsRef.current) {
      vfsRef.current = new VirtualFilesystem();
    }
    
    if (!rpcRef.current) {
      rpcRef.current = new RPCHost();
      
      // Register file system handlers
      rpcRef.current.register('fs.writeFile', async (path: string, content: string) => {
        vfsRef.current?.writeFile(path, content);
        return { success: true };
      });

      rpcRef.current.register('fs.readFile', async (path: string) => {
        const content = vfsRef.current?.readFile(path);
        if (content === null) {
          throw new Error(`File not found: ${path}`);
        }
        return content;
      });

      rpcRef.current.register('fs.deleteFile', async (path: string) => {
        const deleted = vfsRef.current?.deleteFile(path);
        return { deleted };
      });

      // Register runtime handlers
      rpcRef.current.register('runtime.reload', async (entryPath: string) => {
        const content = vfsRef.current?.readFile(entryPath);
        if (content) {
          updateIframe(content);
        }
        return { success: true };
      });

      rpcRef.current.register('runtime.applyCSS', async (path: string, css: string) => {
        vfsRef.current?.writeFile(path, css);
        return { success: true };
      });

      // Register event handlers
      rpcRef.current.register('events.subscribe', async (eventType: string) => {
        // Event subscription logic would go here
        return { subscribed: true, eventType };
      });
    }

    return () => {
      rpcRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isReady) return;

    // Update VFS with current files
    vfsRef.current?.writeFile('/index.html', html);
    vfsRef.current?.writeFile('/styles.css', css);

    // Create secure HTML
    const secureHTML = createSecureHTML(html, css);
    
    // Update iframe content
    updateIframe(secureHTML);
  }, [html, css, isReady]);

  const updateIframe = (content: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    try {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(content);
      doc.close();

      // Intercept console logs
      if (onConsole && iframe.contentWindow) {
        const win = iframe.contentWindow as any;
        const originalConsole = win.console;
        ['log', 'warn', 'error', 'info'].forEach(method => {
          win.console[method] = (...args: any[]) => {
            onConsole(method, args);
            originalConsole[method](...args);
          };
        });
      }

      // Intercept errors
      if (onError && iframe.contentWindow) {
        iframe.contentWindow.addEventListener('error', (event) => {
          onError(new Error(event.message || 'Unknown error'));
        });
      }
    } catch (error) {
      console.error('Failed to update iframe:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // Set RPC target
    rpcRef.current?.setTarget(iframe.contentWindow);
    
    // Send initial VFS snapshot
    const snapshot = vfsRef.current?.getSnapshot();
    if (snapshot) {
      iframe.contentWindow.postMessage({ type: 'vfs-snapshot', snapshot }, '*');
    }

    setIsReady(true);
  };

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-pointer-lock"
      className={className}
      onLoad={handleLoad}
      title="Secure Preview"
    />
  );
}
