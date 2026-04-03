import React, { useState } from 'react';
import { CreditCard, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useWorkflowTrigger } from '@/hooks/useWorkflowTrigger';

interface PaymentButtonProps {
  amount: number;
  currency?: string;
  productName?: string;
  buttonText?: string;
  primaryColor?: string;
  workflowId?: string;
  onPaymentComplete?: (paymentData: any) => void;
  mode?: 'button' | 'form';
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  currency = 'USD',
  productName = 'Product',
  buttonText = 'Pay Now',
  primaryColor = '#3b82f6',
  workflowId,
  onPaymentComplete,
  mode = 'button'
}) => {
  const { triggerPaymentCompleted } = useWorkflowTrigger();
  const [isOpen, setIsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amt);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const paymentData = {
      id: crypto.randomUUID(),
      amount,
      currency,
      productName,
      customerEmail: formData.email,
      customerName: formData.name,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    setProcessing(false);
    setCompleted(true);
    toast.success('Payment successful!');
    
    // Trigger CRM workflow
    await triggerPaymentCompleted({
      paymentId: paymentData.id,
      amount,
      currency,
      productName,
      customerEmail: formData.email,
      customerName: formData.name
    }, workflowId);
    
    onPaymentComplete?.(paymentData);

    setTimeout(() => {
      setIsOpen(false);
      setCompleted(false);
      setFormData({ email: '', name: '', cardNumber: '', expiry: '', cvc: '' });
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {buttonText} {formatCurrency(amount)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {completed ? 'Payment Complete!' : `Pay for ${productName}`}
          </DialogTitle>
        </DialogHeader>

        {completed ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold">Thank you!</p>
            <p className="text-muted-foreground">
              Your payment of {formatCurrency(amount)} was successful.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                {formatCurrency(amount)}
              </p>
            </div>

            <div>
              <Label htmlFor="pay-email">Email</Label>
              <Input
                id="pay-email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="pay-name">Cardholder Name</Label>
              <Input
                id="pay-name"
                placeholder="John Doe"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="pay-card">Card Number</Label>
              <Input
                id="pay-card"
                placeholder="4242 4242 4242 4242"
                value={formData.cardNumber}
                onChange={e => setFormData({ 
                  ...formData, 
                  cardNumber: formatCardNumber(e.target.value) 
                })}
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pay-expiry">Expiry</Label>
                <Input
                  id="pay-expiry"
                  placeholder="MM/YY"
                  value={formData.expiry}
                  onChange={e => setFormData({ 
                    ...formData, 
                    expiry: formatExpiry(e.target.value) 
                  })}
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pay-cvc">CVC</Label>
                <Input
                  id="pay-cvc"
                  placeholder="123"
                  value={formData.cvc}
                  onChange={e => setFormData({ 
                    ...formData, 
                    cvc: e.target.value.replace(/\D/g, '').slice(0, 4) 
                  })}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full text-white"
              style={{ backgroundColor: primaryColor }}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay {formatCurrency(amount)}</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This is a demo payment form. No real charges will be made.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
