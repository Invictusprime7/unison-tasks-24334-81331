/**
 * CRM Daily Automation Cron Job
 * 
 * Runs daily at 6 AM UTC to handle:
 * - Stale lead detection (no activity in 7+ days)
 * - Deal follow-up reminders
 * - Pipeline health monitoring
 * 
 * Schedule: 0 6 * * * (Daily at 6 AM UTC)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '../../src/lib/inngest';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET (Vercel cron) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret — REQUIRED in production
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/crm-daily] CRON_SECRET not configured — rejecting request');
    return res.status(503).json({ error: 'Cron endpoint not configured' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    staleLeads: 0,
    dealReminders: 0,
    pipelineAlerts: 0,
    errors: [] as string[],
  };

  try {
    // 1. Find stale leads (no activity in 7+ days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: staleLeads, error: leadsError } = await supabase
      .from('crm_leads')
      .select('id, business_id, email, status, updated_at')
      .lt('updated_at', sevenDaysAgo.toISOString())
      .in('status', ['new', 'contacted', 'qualified'])
      .limit(100);

    if (leadsError) {
      results.errors.push(`Stale leads query failed: ${leadsError.message}`);
    } else if (staleLeads && staleLeads.length > 0) {
      results.staleLeads = staleLeads.length;
      
      // Emit events for each stale lead
      for (const lead of staleLeads) {
        try {
          await inngest.send({
            name: 'crm/lead.stale',
            data: {
              leadId: lead.id,
              businessId: lead.business_id,
              email: lead.email,
              lastActivity: lead.updated_at,
              currentStatus: lead.status,
            },
          });
        } catch (e) {
          // Log but continue processing
          console.error(`Failed to emit event for stale lead ${lead.id}:`, e);
        }
      }
    }

    // 2. Find deals needing follow-up (in negotiation/proposal for 3+ days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: stalledDeals, error: dealsError } = await supabase
      .from('crm_deals')
      .select('id, business_id, title, stage, contact_id, updated_at')
      .lt('updated_at', threeDaysAgo.toISOString())
      .in('stage', ['proposal', 'negotiation'])
      .limit(100);

    if (dealsError) {
      results.errors.push(`Stalled deals query failed: ${dealsError.message}`);
    } else if (stalledDeals && stalledDeals.length > 0) {
      results.dealReminders = stalledDeals.length;
      
      // Emit follow-up reminder events
      for (const deal of stalledDeals) {
        try {
          await inngest.send({
            name: 'crm/deal.followup.needed',
            data: {
              dealId: deal.id,
              businessId: deal.business_id,
              title: deal.title,
              stage: deal.stage,
              contactId: deal.contact_id,
              daysSinceUpdate: Math.floor(
                (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
              ),
            },
          });
        } catch (e) {
          console.error(`Failed to emit event for deal ${deal.id}:`, e);
        }
      }
    }

    // 3. Pipeline health check - alert if too many deals stuck at one stage
    const { data: pipelineStats, error: pipelineError } = await supabase
      .from('crm_deals')
      .select('stage, business_id')
      .in('stage', ['lead', 'qualified', 'proposal', 'negotiation']);

    if (pipelineError) {
      results.errors.push(`Pipeline stats query failed: ${pipelineError.message}`);
    } else if (pipelineStats) {
      // Group by business and stage
      const stageCountsByBusiness = pipelineStats.reduce((acc, deal) => {
        const key = `${deal.business_id}:${deal.stage}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Alert if any stage has 20+ deals (bottleneck indicator)
      for (const [key, count] of Object.entries(stageCountsByBusiness)) {
        if (count >= 20) {
          const [businessId, stage] = key.split(':');
          results.pipelineAlerts++;
          
          try {
            await inngest.send({
              name: 'crm/pipeline.bottleneck',
              data: {
                businessId,
                stage,
                dealCount: count,
                threshold: 20,
              },
            });
          } catch (e) {
            console.error(`Failed to emit pipeline alert:`, e);
          }
        }
      }
    }

    // Log results
    console.log('CRM Daily Cron Results:', results);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('CRM Daily Cron Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
