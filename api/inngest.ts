/**
 * Inngest API Route
 * 
 * Webhook endpoint for Inngest to invoke workflow functions.
 * Deploy to Vercel: /api/inngest
 * 
 * This endpoint:
 * 1. Receives events from the Intent Executor via inngest-event-bridge
 * 2. Routes them to the appropriate workflow functions
 * 3. Handles durable execution with automatic retries
 * 
 * Environment variables required:
 * - INNGEST_EVENT_KEY: API key for sending events
 * - INNGEST_SIGNING_KEY: Key for validating webhook signatures (production)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serve } from "inngest/express";
import { inngest } from "../src/lib/inngest.js";
import { inngestFunctions } from "../src/lib/inngest-workflows.js";
import { applyApiSecurityHeaders, handlePreflight, sendError } from './_lib/security.js';

// Vercel Functions expose an Express-compatible request/response contract.
// Inngest v3.54 no longer exports `inngest/vercel`; its Express adapter is the
// supported handler for Vercel's Express-like Node functions.
const inngestServeHandler = serve({
  client: inngest,
  functions: inngestFunctions,
});

// Also export as default for @vercel/node runtime compatibility
export default async function inngestHandler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = applyApiSecurityHeaders(req, res, {
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'X-Request-ID',
      'X-Inngest-Signature',
      'X-Inngest-Env',
      'X-Inngest-Framework',
      'X-Inngest-Req-Version',
      'X-Inngest-SDK',
      'X-Inngest-Server-Kind',
    ],
  });

  if (handlePreflight(req, res)) {
    return;
  }

  try {
    if (!['GET', 'POST', 'PUT'].includes(req.method || '')) {
      return sendError(res, 405, 'Method not allowed', requestId);
    }
    return await inngestServeHandler(req, res);
  } catch (error) {
    console.error('Inngest handler error:', error);
    return sendError(res, 500, 'Internal server error', requestId);
  }
}
