/**
 * CRM Booking Reminders Cron Job
 * 
 * Runs every hour to send reminders for upcoming bookings:
 * - 24-hour reminders
 * - 1-hour reminders
 * 
 * Schedule: 0 * * * * (Every hour at minute 0)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '../../src/lib/inngest';

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
    console.error('[cron/booking-reminders] CRON_SECRET not configured — rejecting request');
    return res.status(503).json({ error: 'Cron endpoint not configured' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    reminders24h: 0,
    reminders1h: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    
    // 24-hour window (23-25 hours from now to catch within the hour)
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // 1-hour window (30-90 minutes from now)
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    const in90Min = new Date(now.getTime() + 90 * 60 * 1000);

    // Find bookings needing 24h reminder
    const { data: bookings24h, error: err24h } = await supabase
      .from('crm_bookings')
      .select('id, business_id, contact_id, contact_email, contact_phone, service, scheduled_at')
      .gte('scheduled_at', in23Hours.toISOString())
      .lt('scheduled_at', in25Hours.toISOString())
      .eq('status', 'confirmed')
      .eq('reminder_24h_sent', false)
      .limit(100);

    if (err24h) {
      results.errors.push(`24h reminder query failed: ${err24h.message}`);
    } else if (bookings24h && bookings24h.length > 0) {
      results.reminders24h = bookings24h.length;

      for (const booking of bookings24h) {
        try {
          // Emit reminder event
          await inngest.send({
            name: 'booking/reminder.24h',
            data: {
              bookingId: booking.id,
              businessId: booking.business_id,
              contactId: booking.contact_id,
              contactEmail: booking.contact_email,
              contactPhone: booking.contact_phone,
              service: booking.service,
              scheduledAt: booking.scheduled_at,
            },
          });

          // Mark reminder as sent
          await supabase
            .from('crm_bookings')
            .update({ reminder_24h_sent: true })
            .eq('id', booking.id);
        } catch (e) {
          console.error(`Failed to send 24h reminder for booking ${booking.id}:`, e);
        }
      }
    }

    // Find bookings needing 1h reminder
    const { data: bookings1h, error: err1h } = await supabase
      .from('crm_bookings')
      .select('id, business_id, contact_id, contact_email, contact_phone, service, scheduled_at')
      .gte('scheduled_at', in30Min.toISOString())
      .lt('scheduled_at', in90Min.toISOString())
      .eq('status', 'confirmed')
      .eq('reminder_1h_sent', false)
      .limit(100);

    if (err1h) {
      results.errors.push(`1h reminder query failed: ${err1h.message}`);
    } else if (bookings1h && bookings1h.length > 0) {
      results.reminders1h = bookings1h.length;

      for (const booking of bookings1h) {
        try {
          await inngest.send({
            name: 'booking/reminder.1h',
            data: {
              bookingId: booking.id,
              businessId: booking.business_id,
              contactId: booking.contact_id,
              contactEmail: booking.contact_email,
              contactPhone: booking.contact_phone,
              service: booking.service,
              scheduledAt: booking.scheduled_at,
            },
          });

          await supabase
            .from('crm_bookings')
            .update({ reminder_1h_sent: true })
            .eq('id', booking.id);
        } catch (e) {
          console.error(`Failed to send 1h reminder for booking ${booking.id}:`, e);
        }
      }
    }

    console.log('Booking Reminders Cron Results:', results);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Booking Reminders Cron Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
