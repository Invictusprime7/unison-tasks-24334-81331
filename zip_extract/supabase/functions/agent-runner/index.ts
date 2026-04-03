import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// =============================================================================
// Types
// =============================================================================

// deno-lint-ignore no-explicit-any
type ToolHandler = (payload: Record<string, unknown>, context: ToolContext) => Promise<Record<string, unknown>>

interface ToolContext {
  // deno-lint-ignore no-explicit-any
  supabase: any
  businessId: string
  pluginInstanceId: string | null
}

interface ToolResult {
  tool: string
  success: boolean
  result?: Record<string, unknown>
  error?: string
}

// =============================================================================
// Tool Handlers
// =============================================================================

// --- CRM Tools ---

const crmLeadCreate: ToolHandler = async (payload, context) => {
  const { data, error } = await context.supabase
    .from('crm_leads')
    .insert({
      business_id: context.businessId,
      name: payload.name as string,
      email: payload.email as string,
      title: `Lead: ${payload.name || payload.email}`,
      metadata: { score: payload.score, source: 'ai_agent' },
      status: 'new',
      intent: (payload.intent as string) || 'contact.submit',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create lead: ${error.message}`)
  console.log('[agent-runner] crm.lead.create:', data.id)
  return { leadId: data.id, success: true }
}

const pipelineStageSet: ToolHandler = async (payload, context) => {
  if (!payload.leadId) {
    throw new Error('leadId is required for pipeline.stage.set')
  }

  const { error } = await context.supabase
    .from('crm_leads')
    .update({ status: payload.stage as string })
    .eq('id', payload.leadId)
    .eq('business_id', context.businessId)

  if (error) throw new Error(`Failed to update pipeline stage: ${error.message}`)
  console.log('[agent-runner] pipeline.stage.set:', payload.leadId, '->', payload.stage)
  return { updated: true, stage: payload.stage }
}

// --- Notification Tools ---

const notifyTeam: ToolHandler = async (payload, context) => {
  const { data: business } = await context.supabase
    .from('businesses')
    .select('notification_email, owner_id')
    .eq('id', context.businessId)
    .single()

  const notifyEmail = business?.notification_email

  console.log('[agent-runner] notify.team:', {
    to: notifyEmail || 'owner',
    message: payload.message,
    priority: payload.priority || 'normal',
  })

  // TODO: Integrate with Resend for actual email delivery
  return { notified: true, channel: 'email' }
}

// --- State Tools ---

const statePatch: ToolHandler = async (payload, context) => {
  if (!context.pluginInstanceId) {
    console.log('[agent-runner] state.patch skipped - no plugin instance')
    return { patched: false, reason: 'no_plugin_instance' }
  }

  const stateKey = (payload.key as string) || 'agent_state'
  const patch = payload.patch as Record<string, unknown>

  const { data: existing } = await context.supabase
    .from('ai_plugin_state')
    .select('state')
    .eq('plugin_instance_id', context.pluginInstanceId)
    .eq('state_key', stateKey)
    .single()

  const currentState = existing?.state || {}
  const newState = { ...currentState, ...patch, _lastPatchedAt: new Date().toISOString() }

  const { error } = await context.supabase
    .from('ai_plugin_state')
    .upsert(
      {
        plugin_instance_id: context.pluginInstanceId,
        state_key: stateKey,
        state: newState,
      },
      { onConflict: 'plugin_instance_id,state_key' }
    )

  if (error) throw new Error(`Failed to patch state: ${error.message}`)
  console.log('[agent-runner] state.patch:', stateKey, Object.keys(patch))
  return { patched: true, stateKey }
}

// --- Calendar Tools (Phase 2 - Booking Agent) ---

const calendarCheck: ToolHandler = async (payload, context) => {
  const { date, service_id, duration_minutes } = payload
  
  const requestedDate = new Date(date as string)
  const startOfDay = new Date(requestedDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(requestedDate)
  endOfDay.setHours(23, 59, 59, 999)

  let query = context.supabase
    .from('availability_slots')
    .select('id, starts_at, ends_at, service_id, is_booked')
    .eq('business_id', context.businessId)
    .eq('is_booked', false)
    .gte('starts_at', startOfDay.toISOString())
    .lte('starts_at', endOfDay.toISOString())
    .order('starts_at', { ascending: true })

  if (service_id) {
    query = query.eq('service_id', service_id)
  }

  const { data: slots, error } = await query

  if (error) throw new Error(`Failed to check calendar: ${error.message}`)

  const requestedDuration = (duration_minutes as number) || 30
  // deno-lint-ignore no-explicit-any
  const availableSlots = (slots || []).filter((slot: any) => {
    const slotStart = new Date(slot.starts_at)
    const slotEnd = new Date(slot.ends_at)
    const slotDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60)
    return slotDuration >= requestedDuration
  })

  // deno-lint-ignore no-explicit-any
  const formattedSlots = availableSlots.map((slot: any) => {
    const start = new Date(slot.starts_at)
    return {
      id: slot.id,
      time: start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
    }
  })

  console.log('[agent-runner] calendar.check:', { date, slotsFound: formattedSlots.length })

  return {
    available: formattedSlots.length > 0,
    slots: formattedSlots,
    date: date as string,
    message: formattedSlots.length > 0 
      ? `Found ${formattedSlots.length} available slots`
      : 'No available slots for this date',
  }
}

const calendarBook: ToolHandler = async (payload, context) => {
  const {
    slot_id,
    customer_name,
    customer_email,
    customer_phone,
    service_name,
    notes,
    date,
    time,
    duration_minutes,
  } = payload

  if (slot_id) {
    // Verify slot exists and is available
    const { data: slot, error: slotError } = await context.supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slot_id)
      .eq('business_id', context.businessId)
      .eq('is_booked', false)
      .single()

    if (slotError || !slot) {
      throw new Error('Slot not available or not found')
    }

    // Mark slot as booked
    const { error: updateError } = await context.supabase
      .from('availability_slots')
      .update({ is_booked: true })
      .eq('id', slot_id)

    if (updateError) throw new Error(`Failed to reserve slot: ${updateError.message}`)

    const slotStart = new Date(slot.starts_at)
    const slotEnd = new Date(slot.ends_at)
    const bookingDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60)

    const { data: booking, error: bookingError } = await context.supabase
      .from('bookings')
      .insert({
        business_id: context.businessId,
        service_id: slot.service_id,
        service_name: (service_name as string) || 'Appointment',
        customer_name: customer_name as string,
        customer_email: customer_email as string,
        customer_phone: customer_phone as string,
        booking_date: slotStart.toISOString().split('T')[0],
        booking_time: slotStart.toTimeString().slice(0, 5),
        duration_minutes: bookingDuration,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        status: 'confirmed',
        notes: notes as string,
        metadata: { source: 'ai_agent', slot_id },
      })
      .select('id')
      .single()

    if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`)

    console.log('[agent-runner] calendar.book:', { bookingId: booking.id, slotId: slot_id })

    return {
      success: true,
      bookingId: booking.id,
      confirmation: {
        date: slotStart.toISOString().split('T')[0],
        time: slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        duration: bookingDuration,
        customer: customer_name,
      },
    }
  }

  // Direct booking without pre-selected slot
  if (!date || !time) {
    throw new Error('Either slot_id or date+time required for booking')
  }

  const bookingDate = new Date(`${date}T${time}`)
  const durationMins = (duration_minutes as number) || 30
  const endTime = new Date(bookingDate.getTime() + durationMins * 60 * 1000)

  const { data: booking, error: bookingError } = await context.supabase
    .from('bookings')
    .insert({
      business_id: context.businessId,
      service_name: (service_name as string) || 'Appointment',
      customer_name: customer_name as string,
      customer_email: customer_email as string,
      customer_phone: customer_phone as string,
      booking_date: date as string,
      booking_time: time as string,
      duration_minutes: durationMins,
      starts_at: bookingDate.toISOString(),
      ends_at: endTime.toISOString(),
      status: 'pending',
      notes: notes as string,
      metadata: { source: 'ai_agent', direct_booking: true },
    })
    .select('id')
    .single()

  if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`)

  console.log('[agent-runner] calendar.book (direct):', { bookingId: booking.id, date, time })

  return {
    success: true,
    bookingId: booking.id,
    requiresConfirmation: true,
    confirmation: {
      date: date as string,
      time: time as string,
      duration: durationMins,
      customer: customer_name,
    },
  }
}

// --- Agent Routing Tools (Orchestrator) ---

const agentRoute: ToolHandler = async (payload, _context) => {
  console.log('[agent-runner] agent.route:', payload.targetAgent)
  return {
    routed: true,
    targetAgent: payload.targetAgent,
    priority: payload.priority || 'normal',
  }
}

const agentInvoke: ToolHandler = async (payload, context) => {
  const { data, error } = await context.supabase
    .from('ai_events')
    .insert({
      business_id: context.businessId,
      plugin_instance_id: context.pluginInstanceId,
      intent: payload.intent as string,
      payload: payload.eventPayload || {},
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to invoke agent: ${error.message}`)
  
  console.log('[agent-runner] agent.invoke:', { eventId: data.id, intent: payload.intent })

  return {
    invoked: true,
    eventId: data.id,
    intent: payload.intent,
  }
}

// =============================================================================
// Tool Registry
// =============================================================================

const toolHandlers: Record<string, ToolHandler> = {
  // CRM
  'crm.lead.create': crmLeadCreate,
  'pipeline.stage.set': pipelineStageSet,
  
  // Notifications
  'notify.team': notifyTeam,
  
  // State
  'state.patch': statePatch,
  
  // Calendar (Phase 2)
  'calendar.check': calendarCheck,
  'calendar.book': calendarBook,
  
  // Agent routing (Orchestrator)
  'agent.route': agentRoute,
  'agent.invoke': agentInvoke,
}

async function executeTool(
  toolId: string,
  payload: Record<string, unknown>,
  context: ToolContext
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const handler = toolHandlers[toolId]
  if (!handler) {
    console.warn('[agent-runner] Unknown tool:', toolId)
    return { success: false, error: `Unknown tool: ${toolId}` }
  }

  try {
    const result = await handler(payload, context)
    return { success: true, result }
  } catch (err) {
    const error = err as Error
    console.error('[agent-runner] Tool execution failed:', toolId, error)
    return { success: false, error: error.message }
  }
}

// =============================================================================
// LLM Integration
// =============================================================================

async function callLLM(
  systemPrompt: string,
  userPayload: Record<string, unknown>
): Promise<{ 
  score?: number
  tags?: string[]
  stage?: string
  outcome?: string
  notes?: string
  action?: string
  proposedToolCalls?: Array<{ tool: string; payload: Record<string, unknown> }>
  // deno-lint-ignore no-explicit-any
  [key: string]: any 
}> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  
  if (!lovableApiKey) {
    console.error('[agent-runner] LOVABLE_API_KEY not configured')
    throw new Error('LLM service not configured')
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[agent-runner] LLM call failed:', response.status, errorText)
    throw new Error(`LLM call failed: ${response.status}`)
  }

  const result = await response.json()
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content in LLM response')
  }

  try {
    return JSON.parse(content)
  } catch {
    console.error('[agent-runner] Failed to parse LLM response as JSON:', content)
    throw new Error('Invalid JSON response from LLM')
  }
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse optional request body for specific event processing
    let targetEventId: string | null = null
    try {
      const body = await req.json()
      targetEventId = body?.eventId || null
    } catch {
      // No body or invalid JSON - process next pending event
    }

    // Claim a pending event (with lease timeout recovery)
    const leaseTimeoutMinutes = 5
    const leaseThreshold = new Date(Date.now() - leaseTimeoutMinutes * 60 * 1000).toISOString()

    let eventQuery = supabase
      .from('ai_events')
      .select('*')
      .or(`status.eq.pending,and(status.eq.processing,locked_at.lt.${leaseThreshold})`)
      .order('created_at', { ascending: true })
      .limit(1)

    if (targetEventId) {
      eventQuery = supabase
        .from('ai_events')
        .select('*')
        .eq('id', targetEventId)
        .limit(1)
    }

    const { data: events, error: fetchError } = await eventQuery

    if (fetchError) {
      console.error('[agent-runner] Failed to fetch events:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!events || events.length === 0) {
      console.log('[agent-runner] No pending events')
      return new Response(
        JSON.stringify({ status: 'idle', message: 'No pending events' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const event = events[0]
    const runnerId = `runner-${crypto.randomUUID().slice(0, 8)}`

    console.log('[agent-runner] Processing event:', {
      eventId: event.id,
      intent: event.intent,
      businessId: event.business_id,
      runnerId,
    })

    // Lock the event
    const { error: lockError } = await supabase
      .from('ai_events')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        locked_by: runnerId,
      })
      .eq('id', event.id)

    if (lockError) {
      console.error('[agent-runner] Failed to lock event:', lockError)
      return new Response(
        JSON.stringify({ error: 'Failed to lock event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create run record
    const { data: run, error: runError } = await supabase
      .from('ai_runs')
      .insert({
        event_id: event.id,
        plugin_instance_id: event.plugin_instance_id,
        business_id: event.business_id,
        status: 'processing',
        input_payload: event.payload,
      })
      .select('id')
      .single()

    if (runError) {
      console.error('[agent-runner] Failed to create run record:', runError)
    }

    // Link event to run
    if (run) {
      await supabase
        .from('ai_events')
        .update({ claimed_run_id: run.id })
        .eq('id', event.id)
    }

    // Get agent configuration - route based on intent
    let systemPrompt: string
    let allowedTools: string[]
    let agentSlug: string = 'lead_qualifier'

    // Check orchestrator config for routing
    const { data: orchestrator } = await supabase
      .from('ai_agent_registry')
      .select('default_config')
      .eq('slug', 'unison_ai')
      .eq('is_active', true)
      .single()

    if (orchestrator?.default_config?.routing) {
      const routing = orchestrator.default_config.routing as Record<string, string>
      if (routing[event.intent]) {
        agentSlug = routing[event.intent]
        console.log('[agent-runner] Routed to agent:', agentSlug, 'for intent:', event.intent)
      }
    }

    // Get the target agent
    const { data: agent } = await supabase
      .from('ai_agent_registry')
      .select('system_prompt, allowed_tools, slug, is_active')
      .eq('slug', agentSlug)
      .eq('is_active', true)
      .single()

    if (agent) {
      systemPrompt = agent.system_prompt
      allowedTools = agent.allowed_tools || []
      console.log('[agent-runner] Using agent:', agent.slug, 'with', allowedTools.length, 'tools')
    } else {
      // Fallback to default lead qualifier
      const { data: defaultAgent } = await supabase
        .from('ai_agent_registry')
        .select('system_prompt, allowed_tools')
        .eq('slug', 'lead_qualifier')
        .single()

      systemPrompt = defaultAgent?.system_prompt || 'You are a helpful assistant. Respond with JSON.'
      allowedTools = defaultAgent?.allowed_tools || []
      console.log('[agent-runner] Fallback to lead_qualifier')
    }

    // Call LLM
    let llmResult: Awaited<ReturnType<typeof callLLM>>
    const tokensUsed = 0

    try {
      llmResult = await callLLM(systemPrompt, {
        intent: event.intent,
        ...event.payload,
      })
      console.log('[agent-runner] LLM response:', llmResult)
    } catch (err) {
      const error = err as Error
      console.error('[agent-runner] LLM call failed:', error)

      await supabase
        .from('ai_events')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', event.id)

      if (run) {
        await supabase
          .from('ai_runs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
            latency_ms: Date.now() - startTime,
          })
          .eq('id', run.id)
      }

      return new Response(
        JSON.stringify({ status: 'failed', error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Execute proposed tool calls
    const toolCallResults: ToolResult[] = []
    const toolContext: ToolContext = {
      supabase,
      businessId: event.business_id,
      pluginInstanceId: event.plugin_instance_id,
    }

    for (const toolCall of llmResult.proposedToolCalls || []) {
      // Verify tool is allowed
      if (!allowedTools.includes(toolCall.tool)) {
        console.warn('[agent-runner] Tool not allowed:', toolCall.tool)
        toolCallResults.push({
          tool: toolCall.tool,
          success: false,
          error: 'Tool not authorized for this agent',
        })
        continue
      }

      const result = await executeTool(toolCall.tool, toolCall.payload, toolContext)
      toolCallResults.push({
        tool: toolCall.tool,
        ...result,
      })
    }

    // Update plugin state if instance exists
    if (event.plugin_instance_id) {
      await supabase
        .from('ai_plugin_state')
        .upsert({
          plugin_instance_id: event.plugin_instance_id,
          state_key: 'latest_analysis',
          state: {
            score: llmResult.score,
            tags: llmResult.tags,
            stage: llmResult.stage,
            outcome: llmResult.outcome,
            action: llmResult.action,
            notes: llmResult.notes,
            lastProcessedAt: new Date().toISOString(),
            lastEventId: event.id,
          },
        }, {
          onConflict: 'plugin_instance_id,state_key',
        })
    }

    // Mark event as completed
    await supabase
      .from('ai_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', event.id)

    // Update run record
    const latencyMs = Date.now() - startTime
    if (run) {
      await supabase
        .from('ai_runs')
        .update({
          status: 'completed',
          output_payload: llmResult,
          tool_calls: toolCallResults,
          tokens_used: tokensUsed,
          latency_ms: latencyMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id)
    }

    console.log('[agent-runner] Event processed successfully:', {
      eventId: event.id,
      runId: run?.id,
      agentUsed: agentSlug,
      latencyMs,
      toolCallsExecuted: toolCallResults.length,
    })

    return new Response(
      JSON.stringify({
        status: 'completed',
        eventId: event.id,
        runId: run?.id,
        agent: agentSlug,
        result: {
          score: llmResult.score,
          stage: llmResult.stage,
          outcome: llmResult.outcome,
          action: llmResult.action,
          tags: llmResult.tags,
        },
        toolCalls: toolCallResults,
        latencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[agent-runner] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})