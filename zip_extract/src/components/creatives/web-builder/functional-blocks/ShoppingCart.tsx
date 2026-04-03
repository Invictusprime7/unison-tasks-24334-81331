import React, { useState } from 'react';
import { ShoppingCart as CartIcon, Minus, Plus, Trash2, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useTemplateAutomation } from '@/hooks/useTemplateAutomation';
import { useWorkflowTrigger } from '@/hooks/useWorkflowTrigger';

interface ShoppingCartProps {
  primaryColor?: string;
  showBadge?: boolean;
  workflowId?: string;
  onCheckoutComplete?: (order: any) => void;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  primaryColor = '#3b82f6',
  showBadge = true,
  workflowId,
  onCheckoutComplete
}) => {
  const { 
    cart, 
    cartTotal, 
    cartCount, 
    updateCartItem, 
    removeFromCart, 
    createOrder,
    loading 
  } = useTemplateAutomation();
  const { triggerCartCheckout } = useWorkflowTrigger();
  
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [checkoutData, setCheckoutData] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    zip: ''
  });
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const order = await createOrder({
      customerEmail: checkoutData.email,
      customerName: checkoutData.name,
      shippingAddress: {
        address: checkoutData.address,
        city: checkoutData.city,
        zip: checkoutData.zip
      }
    });

    if (order) {
      setCompletedOrder(order);
      setCheckoutStep('success');
      
      // Trigger CRM workflow
      await triggerCartCheckout({
        orderId: order.id,
        customerEmail: checkoutData.email,
        customerName: checkoutData.name,
        items: cart.map(item => ({
          productId: item.product_id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        })),
        subtotal: cartTotal,
        total: order.total
      }, workflowId);
      
      onCheckoutComplete?.(order);
    }
  };

  const tax = cartTotal * 0.1;
  const total = cartTotal + tax;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <CartIcon className="w-5 h-5" />
          {showBadge && cartCount > 0 && (
            <span 
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs text-white flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              {cartCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {checkoutStep === 'cart' && 'Your Cart'}
            {checkoutStep === 'checkout' && 'Checkout'}
            {checkoutStep === 'success' && 'Order Confirmed!'}
          </SheetTitle>
        </SheetHeader>

        {checkoutStep === 'cart' && (
          <>
            <div className="flex-1 overflow-auto py-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Your cart is empty
                </p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-3">
                      {item.product.image_url && (
                        <img 
                          src={item.product.image_url} 
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${item.product.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCartItem(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 ml-auto text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => setCheckoutStep('checkout')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Checkout
                </Button>
              </div>
            )}
          </>
        )}

        {checkoutStep === 'checkout' && (
          <form onSubmit={handleCheckout} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto py-4 space-y-4">
              <div>
                <Label htmlFor="checkout-email">Email *</Label>
                <Input
                  id="checkout-email"
                  type="email"
                  value={checkoutData.email}
                  onChange={e => setCheckoutData({ ...checkoutData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="checkout-name">Full Name *</Label>
                <Input
                  id="checkout-name"
                  value={checkoutData.name}
                  onChange={e => setCheckoutData({ ...checkoutData, name: e.target.value })}
                  required
                />
              </div>
              <Separator />
              <p className="text-sm font-medium">Shipping Address</p>
              <div>
                <Label htmlFor="checkout-address">Address</Label>
                <Input
                  id="checkout-address"
                  value={checkoutData.address}
                  onChange={e => setCheckoutData({ ...checkoutData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="checkout-city">City</Label>
                  <Input
                    id="checkout-city"
                    value={checkoutData.city}
                    onChange={e => setCheckoutData({ ...checkoutData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="checkout-zip">ZIP Code</Label>
                  <Input
                    id="checkout-zip"
                    value={checkoutData.zip}
                    onChange={e => setCheckoutData({ ...checkoutData, zip: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCheckoutStep('cart')}
                >
                  Back
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 text-white"
                  style={{ backgroundColor: primaryColor }}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {checkoutStep === 'success' && completedOrder && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CartIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground mb-4">
              Your order has been placed successfully.
            </p>
            <p className="text-sm">
              Order ID: <span className="font-mono">{completedOrder.id.slice(0, 8)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total: ${completedOrder.total.toFixed(2)}
            </p>
            <Button 
              className="mt-6"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setCheckoutStep('cart');
              }}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
