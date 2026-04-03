import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WorkflowTriggerEvent = 
  | 'button_click'
  | 'form_submit'
  | 'booking_created'
  | 'payment_completed'
  | 'cart_checkout'
  | 'calendar_booked';

interface TriggerWorkflowParams {
  event: WorkflowTriggerEvent;
  workflowId?: string;
  data?: Record<string, unknown>;
}

export const useWorkflowTrigger = () => {
  const triggerWorkflow = useCallback(async ({ event, workflowId, data = {} }: TriggerWorkflowParams) => {
    try {
      // If specific workflow ID provided, trigger that workflow
      if (workflowId) {
        const { data: result, error } = await supabase.functions.invoke('workflow-trigger', {
          body: {
            workflowId,
            triggerData: {
              event,
              timestamp: new Date().toISOString(),
              ...data
            }
          }
        });
        
        if (error) {
          console.error('Error triggering workflow:', error);
          return null;
        }
        
        console.log('Workflow triggered:', result);
        return result;
      }

      // Otherwise, find workflows that match the event trigger type
      const triggerTypeMap: Record<WorkflowTriggerEvent, string> = {
        button_click: 'button_click',
        form_submit: 'form_submit',
        booking_created: 'booking',
        payment_completed: 'payment',
        cart_checkout: 'checkout',
        calendar_booked: 'booking'
      };

      const triggerType = triggerTypeMap[event];
      
      // Query active workflows with matching trigger type
      const { data: workflows, error: queryError } = await supabase
        .from('crm_workflows')
        .select('id, name, trigger_config')
        .eq('trigger_type', triggerType)
        .eq('is_active', true);

      if (queryError) {
        console.error('Error querying workflows:', queryError);
        return null;
      }

      if (!workflows || workflows.length === 0) {
        console.log('No matching workflows found for event:', event);
        return null;
      }

      // Trigger all matching workflows
      const results = await Promise.all(
        workflows.map(async (workflow) => {
          const { data: result, error } = await supabase.functions.invoke('workflow-trigger', {
            body: {
              workflowId: workflow.id,
              triggerData: {
                event,
                workflowName: workflow.name,
                timestamp: new Date().toISOString(),
                ...data
              }
            }
          });

          if (error) {
            console.error(`Error triggering workflow ${workflow.name}:`, error);
            return null;
          }

          return result;
        })
      );

      return results.filter(Boolean);
    } catch (error) {
      console.error('Error in triggerWorkflow:', error);
      return null;
    }
  }, []);

  const triggerButtonClick = useCallback((buttonId: string, buttonLabel: string, workflowId?: string) => {
    return triggerWorkflow({
      event: 'button_click',
      workflowId,
      data: { buttonId, buttonLabel }
    });
  }, [triggerWorkflow]);

  const triggerFormSubmit = useCallback((formId: string, formName: string, formData: Record<string, unknown>, workflowId?: string) => {
    return triggerWorkflow({
      event: 'form_submit',
      workflowId,
      data: { formId, formName, formData }
    });
  }, [triggerWorkflow]);

  const triggerBookingCreated = useCallback((bookingData: Record<string, unknown>, workflowId?: string) => {
    return triggerWorkflow({
      event: 'booking_created',
      workflowId,
      data: bookingData
    });
  }, [triggerWorkflow]);

  const triggerPaymentCompleted = useCallback((paymentData: Record<string, unknown>, workflowId?: string) => {
    return triggerWorkflow({
      event: 'payment_completed',
      workflowId,
      data: paymentData
    });
  }, [triggerWorkflow]);

  const triggerCartCheckout = useCallback((orderData: Record<string, unknown>, workflowId?: string) => {
    return triggerWorkflow({
      event: 'cart_checkout',
      workflowId,
      data: orderData
    });
  }, [triggerWorkflow]);

  return {
    triggerWorkflow,
    triggerButtonClick,
    triggerFormSubmit,
    triggerBookingCreated,
    triggerPaymentCompleted,
    triggerCartCheckout
  };
};

