/**
 * Inngest Event Send API
 * 
 * Endpoint for manually sending events to Inngest workflows.
 * Deploy to Vercel: /api/inngest-send
 * 
 * Usage:
 * POST /api/inngest-send
 * {
 *   "event": "crm/lead.created",
 *   "data": {
 *     "leadId": "lead_123",
 *     "businessId": "biz_456",
 *     "email": "test@example.com"
 *   }
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { inngest, type InngestEvents } from '../src/lib/inngest';
import {
  applyApiSecurityHeaders,
  handlePreflight,
  sendError,
} from './_lib/security';

// Allowed events that can be sent via this endpoint
const ALLOWED_EVENTS: Set<keyof InngestEvents> = new Set([
  // CRM events
  'crm/deal.created',
  'crm/deal.stage.changed',
  'crm/lead.created',
  'crm/lead.status.changed',
  'crm/contact.created',
  
  // Booking events
  'booking/created',
  'booking/reminded',
  'booking/reminder.24h',
  'booking/reminder.1h',
  'booking/completed',
  'booking/no.show',
  
  // Form events
  'form/submitted',
  
  // Automation events
  'automation/trigger',
  
  // Commerce events
  'checkout/started',
  'order/created',
  'order/shipped',
  'order/delivered',
  'cart/abandoned',
  
  // Newsletter
  'newsletter/subscribed',
]);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = applyApiSecurityHeaders(req, res, {
    methods: ['POST', 'OPTIONS'],
  });

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed', requestId);
  }

  // Require API key or Bearer token for event ingestion
  const authHeader = req.headers.authorization;
  const apiKey = process.env.INNGEST_SEND_API_KEY;
  
  if (apiKey) {
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return sendError(res, 401, 'Unauthorized', requestId);
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[inngest-send] INNGEST_SEND_API_KEY not configured — rejecting in production');
    return sendError(res, 503, 'Event ingestion not configured', requestId);
  }

  try {
    const { event, data } = req.body as {
      event: string;
      data: Record<string, unknown>;
    };

    if (!event || !data) {
      return sendError(res, 400, 'Missing required fields', requestId, {
        required: ['event', 'data'],
      });
    }

    // Validate event name
    if (!ALLOWED_EVENTS.has(event as keyof InngestEvents)) {
      return sendError(res, 400, 'Invalid event', requestId, {
        // Don't expose allowed events list in production
        ...(process.env.NODE_ENV !== 'production' ? { allowedEvents: Array.from(ALLOWED_EVENTS) } : {}),
      });
    }

    // Add timestamp if not present
    const enrichedData = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      source: data.source || 'api',
    };

    console.log(`[inngest-send] Sending event: ${event}`);

    // Send to Inngest
    const result = await inngest.send({
      name: event,
      data: enrichedData,
    } as any);

    return res.status(200).json({
      success: true,
      event,
      ids: (result as { ids?: string[] }).ids,
      requestId,
    });
  } catch (error) {
    console.error('[inngest-send] Error:', error);
    return sendError(res, 500, 'Failed to send event', requestId, {
      // Don't expose error details in production
      ...(process.env.NODE_ENV !== 'production' ? { message: (error as Error).message } : {}),
    });
  }
}
