/**
 * Intent Button Component
 * A button that triggers intents via the Intent Router
 */

import React, { useState } from 'react';
import { handleIntent, IntentPayload } from '@/runtime/intentRouter';
import { isCoreIntent } from '@/coreIntents';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface IntentButtonProps {
  intent: string;
  payload?: IntentPayload;
  children: React.ReactNode;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  showToast?: boolean;
}

export function IntentButton({
  intent,
  payload = {},
  children,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  showToast = true,
}: IntentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (!isCoreIntent(intent)) {
      const error = `This action is preview-only (unsupported intent): ${intent}`;
      console.error(error);
      if (showToast) toast.error(error);
      onError?.(error);
      return;
    }

    setLoading(true);
    setStatus('idle');
    
    try {
      const result = await handleIntent(intent, payload);
      
      if (result.success) {
        setStatus('success');
        if (showToast && successMessage) {
          toast.success(successMessage);
        } else if (showToast && result.data && typeof result.data === 'object' && 'message' in result.data) {
          toast.success((result.data as { message: string }).message);
        }
        onSuccess?.(result.data);
        
        // Reset status after 2 seconds
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        const error = result.error || 'Something went wrong';
        if (showToast) {
          toast.error(errorMessage || error);
        }
        onError?.(error);
        
        // Reset status after 2 seconds
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch (error) {
      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (showToast) {
        toast.error(errorMessage || errorMsg);
      }
      onError?.(errorMsg);
      
      // Reset status after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (loading) {
      return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
    }
    if (status === 'success') {
      return <CheckCircle className="mr-2 h-4 w-4 text-primary" />;
    }
    if (status === 'error') {
      return <AlertCircle className="mr-2 h-4 w-4 text-destructive" />;
    }
    return null;
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading || disabled}
      className={className}
      variant={variant}
      size={size}
    >
      {getIcon()}
      {children}
    </Button>
  );
}

/**
 * Intent Form Component
 * Wraps a form to submit via Intent Router
 */
interface IntentFormProps {
  intent: string;
  basePayload?: IntentPayload;
  children: React.ReactNode;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  className?: string;
}

export function IntentForm({
  intent,
  basePayload = {},
  children,
  onSuccess,
  onError,
  successMessage = "Submitted successfully!",
  className,
}: IntentFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Extract form data
      const formData = new FormData(e.currentTarget);
      const formPayload: Record<string, string> = {};
      formData.forEach((value, key) => {
        formPayload[key] = value.toString();
      });

      // Merge with base payload
      const payload = { ...basePayload, ...formPayload };

      const result = await handleIntent(intent, payload);
      
      if (result.success) {
        toast.success(successMessage);
        onSuccess?.(result.data);
        
        // Reset form
        e.currentTarget.reset();
      } else {
        toast.error(result.error || 'Something went wrong');
        onError?.(result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {typeof children === 'function' 
        ? (children as (props: { loading: boolean }) => React.ReactNode)({ loading })
        : children
      }
    </form>
  );
}

export default IntentButton;
