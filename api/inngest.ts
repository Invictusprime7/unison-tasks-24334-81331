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
import { serve } from "inngest/vercel";
import { inngest } from "../src/lib/inngest";
import { inngestFunctions } from "../src/lib/inngest-workflows";
import { applyApiSecurityHeaders, handlePreflight, sendError } from './_lib/security';

// Create the Inngest serve handler with all workflow functions
// Using Vercel adapter - exports GET, POST, PUT directly
export const { GET, POST, PUT } = serve({
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

  // Convert VercelRequest to standard Request and use the appropriate method handler
  try {
    const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
    const headers = new Headers(req.headers as HeadersInit);
    headers.set('x-request-id', requestId);
    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    let response: Response;
    if (req.method === 'GET') {
      response = await GET(request);
    } else if (req.method === 'POST') {
      response = await POST(request);
    } else if (req.method === 'PUT') {
      response = await PUT(request);
    } else {
      return sendError(res, 405, 'Method not allowed', requestId);
    }

    // Convert Response back to Vercel format
    const body = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    return res.send(body);
  } catch (error) {
    console.error('Inngest handler error:', error);
    return sendError(res, 500, 'Internal server error', requestId);
  }
}
