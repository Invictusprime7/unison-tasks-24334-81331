import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Cart } from '@/runtime/intentExecutor';

interface PreviewCartDrawerProps {
  open: boolean;
  cart: Cart | null;
  initialStep?: 'cart' | 'checkout' | 'success';
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void> | void;
  onRemove: (productId: string) => Promise<void> | void;
  onCheckout: (customer: { email: string; name: string }) => Promise<boolean> | boolean;
}

export const PreviewCartDrawer: React.FC<PreviewCartDrawerProps> = ({
  open,
  cart,
  initialStep = 'cart',
  submitting = false,
  onOpenChange,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>(initialStep);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setStep(initialStep);
    }
  }, [initialStep, open]);

  const subtotal = useMemo(() => cart?.total || 0, [cart?.total]);
  const items = cart?.items || [];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <aside className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {step === 'cart' && 'Your Cart'}
              {step === 'checkout' && 'Checkout'}
              {step === 'success' && 'Order Received'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingCart className="mb-4 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">Your cart is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a product and it will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.productId} className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.name || 'Item'}</p>
                          <p className="text-sm text-muted-foreground">
                            ${(item.price || 0).toFixed(2)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(item.productId)}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-destructive"
                          aria-label={`Remove ${item.name || 'item'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(item.productId, (item.quantity || 1) - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium text-foreground">
                            {item.quantity || 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(item.productId, (item.quantity || 1) + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          ${(((item.price || 0) * (item.quantity || 1))).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={items.length === 0}
                onClick={() => setStep('checkout')}
              >
                Continue to Checkout
              </Button>
            </div>
          </>
        )}

        {step === 'checkout' && (
          <div className="flex flex-1 flex-col px-5 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preview-cart-name">Full name</Label>
                <Input
                  id="preview-cart-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jordan Lee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-cart-email">Email</Label>
                <Input
                  id="preview-cart-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order total</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('cart')}>
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!email.trim() || submitting}
                onClick={async () => {
                  const ok = await onCheckout({ email: email.trim(), name: name.trim() });
                  if (ok) {
                    setStep('success');
                  }
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Order'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Checkout submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The canonical intent pipeline captured the order request and cleared the active cart.
            </p>
            <Button type="button" className="mt-6" onClick={() => onOpenChange(false)}>
              Continue
            </Button>
          </div>
        )}
      </aside>
    </>
  );
};

export default PreviewCartDrawer;
