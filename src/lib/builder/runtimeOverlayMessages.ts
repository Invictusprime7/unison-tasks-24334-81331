/**
 * runtimeOverlayMessages — wires the WebBuilder window-message + cart-event
 * listeners that drive preview overlays (cart, OVERLAY_OPEN/CLOSE) and
 * runtime toasts from the iframe.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 16. Pure DOM wiring:
 * subscribes on attach, returns a cleanup function. No React.
 */

import { toast } from 'sonner';
import { BROWSER_CART_EVENT } from '@/runtime/browserCartManager';
import { mapOverlayIdToConfig } from '@/lib/builder/overlayMapping';
import type { OverlayConfig } from '@/components/preview/PreviewOverlayManager';

export interface RuntimeOverlayCallbacks {
  refreshPreviewCart: () => void;
  openPreviewCart: (step: 'cart' | 'checkout' | 'success') => void;
  setActiveRuntimeOverlay: (overlay: OverlayConfig | null) => void;
  setPreviewCartOpen: (open: boolean) => void;
  setPreviewCartStep: (step: 'cart' | 'checkout' | 'success') => void;
}

export function attachRuntimeOverlayMessages(
  callbacks: RuntimeOverlayCallbacks,
): () => void {
  const handleBrowserCartUpdate = () => callbacks.refreshPreviewCart();
  const handleCartViewIntent = () => callbacks.openPreviewCart('cart');

  const handleRuntimeOverlayMessage = (event: MessageEvent) => {
    if (event.data?.type === 'OVERLAY_OPEN') {
      const overlayId = String(event.data.overlayId || '');
      const payload = (event.data.payload || {}) as Record<string, unknown>;

      if (overlayId === 'cart') {
        const requestedStep = payload.step === 'checkout' ? 'checkout' : 'cart';
        callbacks.openPreviewCart(requestedStep);
        return;
      }

      const nextOverlay = mapOverlayIdToConfig(overlayId, payload);
      if (nextOverlay) {
        callbacks.setActiveRuntimeOverlay(nextOverlay);
      }
    }

    if (event.data?.type === 'OVERLAY_CLOSE') {
      const overlayId = String(event.data.overlayId || '');
      if (!overlayId || overlayId === 'cart') {
        callbacks.setPreviewCartOpen(false);
        callbacks.setPreviewCartStep('cart');
      }
      if (!overlayId || overlayId !== 'cart') {
        callbacks.setActiveRuntimeOverlay(null);
      }
    }

    if (event.data?.type === 'TOAST_SHOW' && event.data.toast?.message) {
      const nextToast = event.data.toast as { type?: string; message: string };
      if (nextToast.type === 'error') toast.error(nextToast.message);
      else if (nextToast.type === 'warning') toast.warning(nextToast.message);
      else if (nextToast.type === 'success') toast.success(nextToast.message);
      else toast(nextToast.message);
    }
  };

  window.addEventListener(BROWSER_CART_EVENT, handleBrowserCartUpdate as EventListener);
  window.addEventListener('message', handleRuntimeOverlayMessage);
  window.addEventListener('intent:cart.view', handleCartViewIntent);

  return () => {
    window.removeEventListener(BROWSER_CART_EVENT, handleBrowserCartUpdate as EventListener);
    window.removeEventListener('message', handleRuntimeOverlayMessage);
    window.removeEventListener('intent:cart.view', handleCartViewIntent);
  };
}
