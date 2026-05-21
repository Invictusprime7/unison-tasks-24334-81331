/**
 * DeployButton Component
 * 
 * One-click deployment button for VFS templates to Vercel/Netlify
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Rocket, ChevronDown, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { useDeployment } from '@/hooks/useDeployment';
import { DeploymentProvider, wrapHtmlForDeployment } from '@/services/deploymentService';
import { toast } from 'sonner';
import GateVerdictStrip from '@/components/web-builder/GateVerdictStrip';
import type { CompiledContract } from '@/platform/core';
import { isPublishReady } from '@/platform/core';

interface DeployButtonProps {
  /** File map to deploy (path -> content) */
  files: Record<string, string>;
  /** Default site name */
  defaultSiteName?: string;
  /** Callback when deployment completes */
  onDeployComplete?: (url: string) => void;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Show provider dropdown */
  showProviderSelect?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Compiled contract used to render the publish-time pre-flight gate strip. */
  contract?: CompiledContract | null;
}

export function DeployButton({
  files,
  defaultSiteName,
  onDeployComplete,
  variant = 'default',
  size = 'default',
  showProviderSelect = true,
  disabled = false,
  contract = null,
}: DeployButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState(defaultSiteName || '');
  const [selectedProvider, setSelectedProvider] = useState<DeploymentProvider>('vercel');

  const { deployToProvider, isDeploying, progress, message, result, reset } = useDeployment(
    'vercel',
    {
      onSuccess: (response) => {
        toast.success('Deployment successful!', {
          description: `Your site is live at ${response.url}`,
          action: response.url
            ? {
                label: 'Open',
                onClick: () => window.open(response.url, '_blank'),
              }
            : undefined,
        });
        if (response.url) {
          onDeployComplete?.(response.url);
        }
      },
      onError: (error) => {
        toast.error('Deployment failed', {
          description: error,
        });
      },
    }
  );

  const handleDeploy = async () => {
    if (!files || Object.keys(files).length === 0) {
      toast.error('No files to deploy');
      return;
    }

    const name = siteName.trim() || `unison-site-${Date.now()}`;
    
    // Process files to ensure proper HTML structure with Tailwind
    const processedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.html') || path === 'index.html') {
        // Wrap HTML files with Tailwind CDN and proper structure
        processedFiles[path] = wrapHtmlForDeployment(content, name);
      } else {
        processedFiles[path] = content;
      }
    }
    
    await deployToProvider(selectedProvider, processedFiles, name);
  };

  const handleOpenDialog = (provider: DeploymentProvider) => {
    setSelectedProvider(provider);
    setSiteName(defaultSiteName || '');
    reset();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isDeploying) {
      setIsDialogOpen(false);
      reset();
    }
  };

  const fileCount = Object.keys(files || {}).length;
  const hasIndexHtml = !!(files && (files['index.html'] || files['/index.html']));

  return (
    <>
      {showProviderSelect ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={variant} size={size} disabled={disabled || fileCount === 0}>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenDialog('vercel')}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 76 65" fill="currentColor">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
              Deploy to Vercel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenDialog('netlify')}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 128 128" fill="currentColor">
                <path d="M85.255 85.26h-13.2l-.59-20.66-21.1-.59-.59 20.66-13.2-.59-.59-44.55 13.2.59.59 20.66 21.1.59-.59-20.07 13.2.59z" />
              </svg>
              Deploy to Netlify
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant={variant}
          size={size}
          disabled={disabled || fileCount === 0}
          onClick={() => handleOpenDialog('vercel')}
        >
          <Rocket className="h-4 w-4 mr-2" />
          Deploy
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deploy to {selectedProvider === 'vercel' ? 'Vercel' : 'Netlify'}
            </DialogTitle>
            <DialogDescription>
              Deploy your template to a live URL in seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Publish-time pre-flight: PreviewGate + PublishGate verdicts */}
            {!result && (
              <GateVerdictStrip contract={contract} compact />
            )}
            {!result && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    placeholder="my-awesome-site"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    disabled={isDeploying}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your site will be available at {siteName || 'your-site'}.
                    {selectedProvider === 'vercel' ? 'vercel.app' : 'netlify.app'}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium mb-1">Files to deploy:</p>
                  <p className="text-muted-foreground">
                    {fileCount} file{fileCount !== 1 ? 's' : ''}
                    {!hasIndexHtml && (
                      <span className="text-destructive ml-2">
                        ⚠️ Missing index.html
                      </span>
                    )}
                  </p>
                </div>

                {isDeploying && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">{message}</p>
                  </div>
                )}
              </>
            )}

            {result && result.status === 'success' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Deployment successful!</span>
                </div>

                {result.url && (
                  <div className="space-y-2">
                    <Label>Live URL</Label>
                    <div className="flex gap-2">
                      <Input value={result.url} readOnly className="font-mono text-sm" />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => window.open(result.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {result.note && (
                  <p className="text-sm text-muted-foreground">{result.note}</p>
                )}
              </div>
            )}

            {result && result.status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Deployment failed</span>
                </div>
                <p className="text-sm text-muted-foreground">{result.error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {!result && (
              <>
                <Button variant="outline" onClick={handleCloseDialog} disabled={isDeploying}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || !hasIndexHtml || (contract ? !isPublishReady(contract) : false)}
                >
                  {isDeploying ? 'Deploying...' : 'Deploy'}
                </Button>
              </>
            )}
            {result && (
              <Button
                variant={result.status === 'success' ? 'default' : 'outline'}
                onClick={handleCloseDialog}
              >
                {result.status === 'success' ? 'Done' : 'Close'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DeployButton;
