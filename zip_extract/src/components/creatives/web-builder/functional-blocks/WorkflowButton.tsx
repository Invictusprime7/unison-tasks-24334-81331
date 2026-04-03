import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWorkflowTrigger } from '@/hooks/useWorkflowTrigger';
import { handleIntent } from '@/runtime/intentRouter';
import { isCoreIntent } from '@/coreIntents';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface WorkflowButtonProps {
  buttonId?: string;
  label: string;
  workflowId?: string;
  intent?: string;
  intentPayload?: Record<string, unknown>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  successMessage?: string;
  onClick?: () => void;
}

export const WorkflowButton: React.FC<WorkflowButtonProps> = ({
  buttonId = 'workflow-button',
  label,
  workflowId,
  intent,
  intentPayload = {},
  variant = 'default',
  size = 'default',
  className,
  style,
  icon,
  successMessage = 'Action completed!',
  onClick
}) => {
  const [loading, setLoading] = useState(false);
  const { triggerButtonClick } = useWorkflowTrigger();

  const handleClick = async () => {
    setLoading(true);
    try {
      // If intent is provided, use the intent router
      if (intent && isCoreIntent(intent)) {
        const result = await handleIntent(intent, intentPayload);
        if (result.success) {
          toast.success(successMessage);
        } else {
          toast.error(result.error || 'Action failed');
        }
      } 
      // Otherwise use workflow trigger
      else if (workflowId) {
        await triggerButtonClick(buttonId, label, workflowId);
        toast.success(successMessage);
      } else {
        // Try to find matching workflows by event type
        await triggerButtonClick(buttonId, label);
        toast.success(successMessage);
      }

      // Call custom onClick handler
      if (onClick) {
        onClick();
      }
    } catch (error) {
      console.error('Button action error:', error);
      toast.error('Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      style={style}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {label}
    </Button>
  );
};
