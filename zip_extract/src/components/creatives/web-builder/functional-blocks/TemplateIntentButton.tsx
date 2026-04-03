/**
 * Template Intent Button
 * A smart button that automatically handles intents based on label matching
 * Perfect for template CTAs - just provide a label and it figures out the intent
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { handleIntent } from '@/runtime/intentRouter';
import { isCoreIntent } from '@/coreIntents';
import { matchLabelToIntent, TemplateCategory } from '@/runtime/templateIntentConfig';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface TemplateIntentButtonProps {
  label: string;
  category?: TemplateCategory;
  intent?: string; // Optional explicit intent override
  payload?: Record<string, unknown>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  successMessage?: string;
  disabled?: boolean;
  showToast?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export const TemplateIntentButton: React.FC<TemplateIntentButtonProps> = ({
  label,
  category,
  intent: explicitIntent,
  payload = {},
  variant = 'default',
  size = 'default',
  className,
  style,
  icon,
  successMessage,
  disabled = false,
  showToast = true,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resolvedIntent, setResolvedIntent] = useState<string | null>(null);

  // Resolve intent from label if not explicitly provided
  useEffect(() => {
    if (explicitIntent) {
      setResolvedIntent(explicitIntent);
    } else {
      const matched = matchLabelToIntent(label, category);
      setResolvedIntent(matched?.intent || null);
    }
  }, [explicitIntent, label, category]);

  const handleClick = async () => {
    if (!resolvedIntent) {
      console.warn('[TemplateIntentButton] No intent resolved for label:', label);
      if (showToast) toast.info(`No action configured for: ${label}`);
      return;
    }

    if (!isCoreIntent(resolvedIntent)) {
      console.warn('[TemplateIntentButton] Unsupported (non-core) intent:', resolvedIntent);
      const msg = 'This action is preview-only and cannot be published yet.';
      if (showToast) toast.error(msg);
      onError?.(msg);
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const result = await handleIntent(resolvedIntent, payload);

      if (result.success) {
        setStatus('success');
        if (showToast) {
          const message = successMessage || 
            (result.data && typeof result.data === 'object' && 'message' in result.data
              ? (result.data as { message: string }).message
              : 'Action completed!');
          toast.success(message);
        }
        onSuccess?.(result.data);
      } else {
        setStatus('error');
        if (showToast) {
          toast.error(result.error || 'Something went wrong');
        }
        onError?.(result.error || 'Unknown error');
      }

      // Reset status after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (showToast) {
        toast.error(errorMsg);
      }
      onError?.(errorMsg);
      setTimeout(() => setStatus('idle'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
    }
    if (status === 'success') {
      return <CheckCircle className="w-4 h-4 mr-2 text-primary" />;
    }
    if (status === 'error') {
      return <AlertCircle className="w-4 h-4 mr-2 text-destructive" />;
    }
    if (icon) {
      return <span className="mr-2">{icon}</span>;
    }
    return null;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      style={style}
      onClick={handleClick}
      disabled={loading || disabled}
      data-intent={resolvedIntent}
      data-category={category}
    >
      {getStatusIcon()}
      {label}
    </Button>
  );
};

/**
 * Template Intent Form Wrapper
 * Wraps a form to submit via the intent router
 */
interface TemplateIntentFormProps {
  intent: string;
  category?: TemplateCategory;
  basePayload?: Record<string, unknown>;
  children: React.ReactNode | ((props: { loading: boolean }) => React.ReactNode);
  successMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export const TemplateIntentForm: React.FC<TemplateIntentFormProps> = ({
  intent,
  category,
  basePayload = {},
  children,
  successMessage = 'Submitted successfully!',
  resetOnSuccess = true,
  className,
  onSuccess,
  onError,
}) => {
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
        if (resetOnSuccess) {
          e.currentTarget.reset();
        }
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
    <form 
      onSubmit={handleSubmit} 
      className={className}
      data-intent={intent}
      data-category={category}
    >
      {typeof children === 'function' ? children({ loading }) : children}
    </form>
  );
};

export default TemplateIntentButton;
