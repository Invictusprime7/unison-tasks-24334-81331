/**
 * CRM Weekly Summary Cron Job
 * 
 * Runs every Monday at 8 AM UTC to generate:
 * - Weekly pipeline summary
 * - Conversion metrics
 * - Activity reports
 * 
 * Schedule: 0 8 * * 1 (Monday at 8 AM UTC)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '../../src/lib/inngest';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

interface WeeklySummary {
  businessId: string;
  period: { start: string; end: string };
  leads: {
    new: number;
    converted: number;
    lost: number;
  };
  deals: {
    created: number;
    won: number;
    lost: number;
    totalValue: number;
    wonValue: number;
  };
  bookings: {
    scheduled: number;
    completed: number;
    noShows: number;
  };
}

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
    console.error('[cron/crm-weekly-summary] CRON_SECRET not configured — rejecting request');
    return res.status(503).json({ error: 'Cron endpoint not configured' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    businessesProcessed: 0,
    summariesGenerated: 0,
    errors: [] as string[],
  };

  try {
    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Get all active businesses
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, owner_id')
      .eq('status', 'active')
      .limit(100);

    if (bizError) {
      results.errors.push(`Business query failed: ${bizError.message}`);
      return res.status(500).json({ success: false, results });
    }

    if (!businesses || businesses.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active businesses to process',
        results,
      });
    }

    for (const business of businesses) {
      results.businessesProcessed++;

      try {
        // Get lead stats
        const { data: leadStats } = await supabase
          .from('crm_leads')
          .select('status, created_at')
          .eq('business_id', business.id)
          .gte('created_at', startDate.toISOString());

        const newLeads = leadStats?.filter(l => 
          new Date(l.created_at) >= startDate
        ).length || 0;
        const convertedLeads = leadStats?.filter(l => l.status === 'converted').length || 0;
        const lostLeads = leadStats?.filter(l => l.status === 'lost').length || 0;

        // Get deal stats
        const { data: dealStats } = await supabase
          .from('crm_deals')
          .select('stage, value, created_at, closed_at')
          .eq('business_id', business.id)
          .or(`created_at.gte.${startDate.toISOString()},closed_at.gte.${startDate.toISOString()}`);

        const createdDeals = dealStats?.filter(d => 
          new Date(d.created_at) >= startDate
        ).length || 0;
        const wonDeals = dealStats?.filter(d => d.stage === 'won').length || 0;
        const lostDeals = dealStats?.filter(d => d.stage === 'lost').length || 0;
        const totalValue = dealStats?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
        const wonValue = dealStats?.filter(d => d.stage === 'won')
          .reduce((sum, d) => sum + (d.value || 0), 0) || 0;

        // Get booking stats
        const { data: bookingStats } = await supabase
          .from('crm_bookings')
          .select('status, scheduled_at')
          .eq('business_id', business.id)
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());

        const scheduledBookings = bookingStats?.length || 0;
        const completedBookings = bookingStats?.filter(b => b.status === 'completed').length || 0;
        const noShows = bookingStats?.filter(b => b.status === 'no_show').length || 0;

        // Build summary
        const summary: WeeklySummary = {
          businessId: business.id,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          leads: {
            new: newLeads,
            converted: convertedLeads,
            lost: lostLeads,
          },
          deals: {
            created: createdDeals,
            won: wonDeals,
            lost: lostDeals,
            totalValue,
            wonValue,
          },
          bookings: {
            scheduled: scheduledBookings,
            completed: completedBookings,
            noShows,
          },
        };

        // Emit weekly summary event
        await inngest.send({
          name: 'crm/weekly.summary',
          data: summary,
        });

        results.summariesGenerated++;
      } catch (e) {
        results.errors.push(`Failed to process business ${business.id}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    console.log('Weekly Summary Cron Results:', results);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Weekly Summary Cron Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
