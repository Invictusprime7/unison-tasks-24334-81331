// Template Backend Handler - Handles redirects, scheduling, authentication, and payment for templates
// Deploy with: supabase functions deploy template-backend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRedirect {
  id: string;
  path: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
  enabled: boolean;
}

interface TemplateScheduling {
  publishAt?: string;
  unpublishAt?: string;
  timezone?: string;
  recurring?: {
    enabled: boolean;
    cron?: string;
    action: 'publish' | 'unpublish' | 'toggle';
  };
}

interface TemplatePayment {
  enabled: boolean;
  provider?: 'stripe' | 'paypal' | 'custom';
  priceId?: string;
  amount?: number;
  currency?: string;
  mode?: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
  webhookSecret?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const templateId = url.searchParams.get('templateId');

    // Parse request body if present
    let body: any = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await req.json();
    }

    switch (action) {
      case 'check-redirect': {
        // Check if a path matches any template redirect
        const path = url.searchParams.get('path');
        if (!path) {
          return new Response(JSON.stringify({ error: 'Path is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: templates, error } = await supabase
          .from('templates')
          .select('id, redirects')
          .not('redirects', 'is', null);

        if (error) throw error;

        for (const template of templates || []) {
          const redirects = template.redirects as TemplateRedirect[] || [];
          const match = redirects.find(r => r.enabled && r.path === path);
          if (match) {
            return new Response(JSON.stringify({
              redirect: true,
              destination: match.destination,
              statusCode: match.statusCode,
              templateId: template.id,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        return new Response(JSON.stringify({ redirect: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check-access': {
        // Check if user has access to a template (authentication check)
        if (!templateId) {
          return new Response(JSON.stringify({ error: 'Template ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;

        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
        }

        const { data: template, error } = await supabase
          .from('templates')
          .select('id, requires_auth, owner_id, visibility')
          .eq('id', templateId)
          .single();

        if (error) throw error;

        if (!template) {
          return new Response(JSON.stringify({ access: false, reason: 'Template not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Public templates - always accessible
        if (template.visibility === 'public' && !template.requires_auth) {
          return new Response(JSON.stringify({ access: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Requires authentication
        if (template.requires_auth && !userId) {
          return new Response(JSON.stringify({ access: false, reason: 'Authentication required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Owner always has access
        if (userId === template.owner_id) {
          return new Response(JSON.stringify({ access: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Private templates - only owner
        if (template.visibility === 'private') {
          return new Response(JSON.stringify({ access: false, reason: 'Private template' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ access: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'process-scheduling': {
        // Process scheduled publish/unpublish actions
        const now = new Date().toISOString();

        // Find templates that should be published
        const { data: toPublish, error: publishError } = await supabase
          .from('templates')
          .select('id, scheduling')
          .eq('status', 'draft')
          .not('scheduling', 'is', null);

        if (publishError) throw publishError;

        const publishResults: string[] = [];
        for (const template of toPublish || []) {
          const scheduling = template.scheduling as TemplateScheduling;
          if (scheduling?.publishAt && new Date(scheduling.publishAt) <= new Date(now)) {
            await supabase
              .from('templates')
              .update({ status: 'published', scheduling: { ...scheduling, publishAt: null } })
              .eq('id', template.id);
            publishResults.push(template.id);
          }
        }

        // Find templates that should be unpublished
        const { data: toUnpublish, error: unpublishError } = await supabase
          .from('templates')
          .select('id, scheduling')
          .eq('status', 'published')
          .not('scheduling', 'is', null);

        if (unpublishError) throw unpublishError;

        const unpublishResults: string[] = [];
        for (const template of toUnpublish || []) {
          const scheduling = template.scheduling as TemplateScheduling;
          if (scheduling?.unpublishAt && new Date(scheduling.unpublishAt) <= new Date(now)) {
            await supabase
              .from('templates')
              .update({ status: 'archived', scheduling: { ...scheduling, unpublishAt: null } })
              .eq('id', template.id);
            unpublishResults.push(template.id);
          }
        }

        return new Response(JSON.stringify({
          processed: true,
          published: publishResults,
          unpublished: unpublishResults,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-payment-session': {
        // Create a payment session for a template
        if (!templateId) {
          return new Response(JSON.stringify({ error: 'Template ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: template, error } = await supabase
          .from('templates')
          .select('id, payment, name')
          .eq('id', templateId)
          .single();

        if (error) throw error;

        const payment = template.payment as TemplatePayment;
        if (!payment?.enabled) {
          return new Response(JSON.stringify({ error: 'Payment not enabled for this template' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Stripe integration
        if (payment.provider === 'stripe') {
          const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
          if (!stripeSecretKey) {
            return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'mode': payment.mode || 'payment',
              'line_items[0][price]': payment.priceId || '',
              'line_items[0][quantity]': '1',
              'success_url': payment.successUrl || `${url.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
              'cancel_url': payment.cancelUrl || `${url.origin}/cancel`,
              'metadata[template_id]': templateId,
            }),
          });

          const session = await stripeResponse.json();
          return new Response(JSON.stringify({
            sessionId: session.id,
            url: session.url,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: 'Unsupported payment provider' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'verify-payment': {
        // Verify a payment session
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
          return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const stripeResponse = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
          {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
            },
          }
        );

        const session = await stripeResponse.json();
        return new Response(JSON.stringify({
          verified: session.payment_status === 'paid',
          templateId: session.metadata?.template_id,
          customerEmail: session.customer_details?.email,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Template backend error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
