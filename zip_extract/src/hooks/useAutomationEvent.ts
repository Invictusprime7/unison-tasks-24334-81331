import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AutomationEventRequest, 
  AutomationEventResponse,
  AutomationIntent 
} from '@/types/automation';

/**
 * Hook for triggering automation events
 * 
 * This hook provides a simple interface to fire automation events
 * that will be routed to the appropriate workflows based on:
 * - Business industry
 * - Intent type
 * - Active recipe mappings
 */
export function useAutomationEvent() {
  /**
   * Fire an automation event
   */
  const fireEvent = useCallback(async (
    request: AutomationEventRequest
  ): Promise<AutomationEventResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('automation-event', {
        body: request,
      });

      if (error) {
        console.error('[useAutomationEvent] Error:', error);
        return {
          success: false,
          triggered: 0,
          error: error.message,
        };
      }

      return data as AutomationEventResponse;
    } catch (err) {
      console.error('[useAutomationEvent] Exception:', err);
      return {
        success: false,
        triggered: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, []);

  /**
   * Fire a button click automation event
   */
  const fireButtonClick = useCallback(async (
    businessId: string,
    buttonId: string,
    buttonLabel: string,
    additionalData?: Record<string, unknown>
  ) => {
    return fireEvent({
      businessId,
      intent: 'button.click',
      payload: {
        buttonId,
        buttonLabel,
        ...additionalData,
      },
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a form submission automation event
   */
  const fireFormSubmit = useCallback(async (
    businessId: string,
    formId: string,
    formData: Record<string, unknown>,
    intent: AutomationIntent = 'form.submit'
  ) => {
    return fireEvent({
      businessId,
      intent,
      payload: {
        formId,
        ...formData,
      },
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a booking created automation event
   */
  const fireBookingCreated = useCallback(async (
    businessId: string,
    bookingData: {
      date: string;
      time: string;
      service?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      [key: string]: unknown;
    }
  ) => {
    return fireEvent({
      businessId,
      intent: 'booking.create',
      payload: bookingData,
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a lead capture automation event
   */
  const fireLeadCapture = useCallback(async (
    businessId: string,
    leadData: {
      email?: string;
      name?: string;
      phone?: string;
      source?: string;
      [key: string]: unknown;
    }
  ) => {
    return fireEvent({
      businessId,
      intent: 'lead.capture',
      payload: leadData,
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a contact form submission automation event
   */
  const fireContactSubmit = useCallback(async (
    businessId: string,
    contactData: {
      email?: string;
      name?: string;
      phone?: string;
      message?: string;
      [key: string]: unknown;
    }
  ) => {
    return fireEvent({
      businessId,
      intent: 'contact.submit',
      payload: contactData,
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a quote request automation event
   */
  const fireQuoteRequest = useCallback(async (
    businessId: string,
    quoteData: {
      email?: string;
      name?: string;
      phone?: string;
      service?: string;
      description?: string;
      [key: string]: unknown;
    }
  ) => {
    return fireEvent({
      businessId,
      intent: 'quote.request',
      payload: quoteData,
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a cart checkout automation event
   */
  const fireCartCheckout = useCallback(async (
    businessId: string,
    orderData: {
      orderId?: string;
      items?: Array<{ name: string; quantity: number; price: number }>;
      total?: number;
      customerEmail?: string;
      [key: string]: unknown;
    }
  ) => {
    return fireEvent({
      businessId,
      intent: 'cart.checkout',
      payload: orderData,
      source: 'template',
    });
  }, [fireEvent]);

  /**
   * Fire a custom intent automation event
   */
  const fireCustomIntent = useCallback(async (
    businessId: string,
    intent: AutomationIntent,
    payload: Record<string, unknown>,
    dedupeKey?: string
  ) => {
    return fireEvent({
      businessId,
      intent,
      payload,
      dedupeKey,
      source: 'api',
    });
  }, [fireEvent]);

  return {
    fireEvent,
    fireButtonClick,
    fireFormSubmit,
    fireBookingCreated,
    fireLeadCapture,
    fireContactSubmit,
    fireQuoteRequest,
    fireCartCheckout,
    fireCustomIntent,
  };
}
