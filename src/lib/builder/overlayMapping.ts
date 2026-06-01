/**
 * Pure overlay-id → OverlayConfig mapping for the preview runtime.
 * Extracted from WebBuilder.tsx (Phase C3). No React deps.
 *
 * The preview iframe posts OVERLAY_OPEN messages keyed by a wide vocabulary
 * of legacy + canonical overlay ids; this maps them to the small set of
 * concrete overlay types PreviewOverlayManager renders.
 */
import type { OverlayConfig } from '@/components/preview/PreviewOverlayManager';

export function mapOverlayIdToConfig(
  overlayId: string,
  payload?: Record<string, unknown>,
): OverlayConfig | null {
  switch (overlayId) {
    case 'auth-login':
      return { type: 'auth-login', payload };
    case 'auth-register':
      return { type: 'auth-register', payload };
    case 'booking':
    case 'booking_intake':
    case 'consultation_intake':
    case 'reservation':
    case 'patient_intake':
      return { type: 'booking', payload };
    case 'contact':
    case 'lead':
    case 'lead-capture':
    case 'project_inquiry':
    case 'property_inquiry':
    case 'volunteer':
    case 'demo_request':
      return { type: 'contact', payload };
    case 'quote':
    case 'quote_request':
      return { type: 'quote', payload };
    case 'newsletter':
    case 'waitlist':
      return { type: 'newsletter', payload };
    case 'checkout':
    case 'payments-setup':
      return { type: 'checkout', payload };
    case 'booking-confirmation':
    case 'order-confirmation':
    case 'confirmation':
      return { type: 'confirmation', payload };
    case 'upgrade':
      return { type: 'upgrade', payload };
    default:
      return null;
  }
}
