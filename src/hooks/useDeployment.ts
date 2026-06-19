/**
 * useDeployment Hook
 * 
 * React hook for deploying VFS templates to Vercel/Netlify
 */

import { useState, useCallback } from 'react';
import {
  deployToVercel,
  deployToNetlify,
  DeploymentResponse,
  DeploymentStatus,
  DeploymentProvider,
  type ProviderDeployOptions,
} from '@/services/deploymentService';

interface UseDeploymentOptions {
  onSuccess?: (response: DeploymentResponse) => void;
  onError?: (error: string) => void;
}

interface UseDeploymentReturn {
  deploy: (
    files: Record<string, string>,
    siteName?: string,
    options?: ProviderDeployOptions,
  ) => Promise<DeploymentResponse>;
  deployToProvider: (
    provider: DeploymentProvider,
    files: Record<string, string>,
    siteName?: string,
    options?: ProviderDeployOptions,
  ) => Promise<DeploymentResponse>;
  isDeploying: boolean;
  progress: number;
  message: string;
  result: DeploymentResponse | null;
  reset: () => void;
}

export function useDeployment(
  defaultProvider: DeploymentProvider = 'vercel',
  options: UseDeploymentOptions = {}
): UseDeploymentReturn {
  const [isDeploying, setIsDeploying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<DeploymentResponse | null>(null);

  const handleProgress = useCallback((status: DeploymentStatus) => {
    setIsDeploying(status.isDeploying);
    setProgress(status.progress);
    setMessage(status.message);
    if (status.result) {
      setResult(status.result);
    }
  }, []);

  const deployToProvider = useCallback(
    async (
      provider: DeploymentProvider,
      files: Record<string, string>,
      siteName?: string,
      providerOptions?: ProviderDeployOptions,
    ): Promise<DeploymentResponse> => {
      setIsDeploying(true);
      setProgress(0);
      setMessage('Starting deployment...');
      setResult(null);

      try {
        const deployFn = provider === 'vercel' ? deployToVercel : deployToNetlify;
        const response = await deployFn(files, siteName, handleProgress, providerOptions);

        if (response.status === 'success') {
          options.onSuccess?.(response);
        } else {
          options.onError?.(response.error || 'Deployment failed');
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        options.onError?.(errorMessage);
        return {
          status: 'error',
          provider,
          error: errorMessage,
        };
      }
    },
    [handleProgress, options]
  );

  const deploy = useCallback(
    async (files: Record<string, string>, siteName?: string, providerOptions?: ProviderDeployOptions) => {
      return deployToProvider(defaultProvider, files, siteName, providerOptions);
    },
    [defaultProvider, deployToProvider]
  );

  const reset = useCallback(() => {
    setIsDeploying(false);
    setProgress(0);
    setMessage('');
    setResult(null);
  }, []);

  return {
    deploy,
    deployToProvider,
    isDeploying,
    progress,
    message,
    result,
    reset,
  };
}
