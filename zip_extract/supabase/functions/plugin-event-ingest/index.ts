import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface EventPayload {
  businessId: string
  pluginInstanceId?: string
  intent: string
  payload: Record<string, unknown>
  dedupeKey?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role for event ingestion (RLS requires service_role for inserts)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body: EventPayload = await req.json()
    
    // Validate required fields
    if (!body.businessId) {
      console.error('[plugin-event-ingest] Missing businessId')
      return new Response(
        JSON.stringify({ error: 'businessId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.intent || body.intent.trim().length === 0) {
      console.error('[plugin-event-ingest] Missing or empty intent')
      return new Response(
        JSON.stringify({ error: 'intent is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', body.businessId)
      .single()

    if (businessError || !business) {
      console.error('[plugin-event-ingest] Business not found:', body.businessId)
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If pluginInstanceId provided, verify it exists and is enabled
    if (body.pluginInstanceId) {
      const { data: instance, error: instanceError } = await supabase
        .from('ai_plugin_instances')
        .select('id, is_enabled')
        .eq('id', body.pluginInstanceId)
        .eq('business_id', body.businessId)
        .single()

      if (instanceError || !instance) {
        console.error('[plugin-event-ingest] Plugin instance not found:', body.pluginInstanceId)
        return new Response(
          JSON.stringify({ error: 'Plugin instance not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!instance.is_enabled) {
        console.log('[plugin-event-ingest] Plugin instance disabled, skipping:', body.pluginInstanceId)
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'Plugin instance is disabled' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Dedupe check: if dedupeKey provided, check for recent duplicate
    if (body.dedupeKey) {
      const dedupeWindowMinutes = 60 // Default 1 hour window
      const dedupeThreshold = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000).toISOString()

      const { data: existingEvent } = await supabase
        .from('ai_events')
        .select('id')
        .eq('business_id', body.businessId)
        .eq('dedupe_key', body.dedupeKey)
        .gte('created_at', dedupeThreshold)
        .limit(1)
        .single()

      if (existingEvent) {
        console.log('[plugin-event-ingest] Duplicate event detected, skipping:', body.dedupeKey)
        return new Response(
          JSON.stringify({ 
            status: 'skipped', 
            reason: 'Duplicate event within dedupe window',
            existingEventId: existingEvent.id 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Insert the event
    const { data: event, error: insertError } = await supabase
      .from('ai_events')
      .insert({
        business_id: body.businessId,
        plugin_instance_id: body.pluginInstanceId || null,
        intent: body.intent.trim(),
        payload: body.payload || {},
        dedupe_key: body.dedupeKey || null,
        status: 'pending',
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('[plugin-event-ingest] Failed to insert event:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create event', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[plugin-event-ingest] Event created:', {
      eventId: event.id,
      businessId: body.businessId,
      intent: body.intent,
      pluginInstanceId: body.pluginInstanceId,
    })

    return new Response(
      JSON.stringify({ 
        status: 'queued',
        eventId: event.id,
        createdAt: event.created_at,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[plugin-event-ingest] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
