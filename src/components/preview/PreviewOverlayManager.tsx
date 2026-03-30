/**
 * Preview Overlay Manager
 * 
 * Renders overlay modals (auth, booking, contact, checkout) for template previews.
 * These overlays appear when intents require user interaction before completing.
 * 
 * Supports:
 * - Auth (sign in/sign up)
 * - Booking (appointment scheduling)
 * - Contact/Lead capture forms
 * - Checkout confirmation
 * - Generic overlays
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, User, Phone, Calendar, MessageSquare, CreditCard, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { executeIntent, type IntentContext } from '@/runtime/intentExecutor';

// ============ TYPES ============

export type OverlayType = 'auth-login' | 'auth-register' | 'booking' | 'contact' | 'checkout' | 'confirmation' | 'upgrade';

export interface OverlayConfig {
  type: OverlayType;
  title?: string;
  description?: string;
  payload?: Record<string, unknown>;
  businessId?: string;
  siteId?: string;
  onSuccess?: (result: unknown) => void;
  onCancel?: () => void;
}

export interface PreviewOverlayManagerProps {
  activeOverlay: OverlayConfig | null;
  onClose: () => void;
  businessId?: string;
  siteId?: string;
}

// ============ AUTH OVERLAY ============

interface AuthOverlayProps {
  mode: 'login' | 'register';
  siteId?: string;
  businessId?: string;
  onSuccess: (user: unknown) => void;
  onClose: () => void;
  onModeSwitch: () => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ mode, siteId, businessId, onSuccess, onClose, onModeSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        
        // Use site-scoped auth when siteId is available
        if (siteId) {
          const { data, error: authError } = await supabase.functions.invoke('site-auth', {
            body: {
              action: 'register',
              siteId,
              businessId,
              email,
              password,
              name,
            },
          });
          
          if (authError) throw new Error(authError.message);
          if (!data?.success) throw new Error(data?.error || 'Registration failed');
          
          // Store site session in localStorage
          localStorage.setItem(`site_session:${siteId}`, JSON.stringify(data.session));
          
          toast.success('Account created successfully!');
          onSuccess(data.user);
        } else {
          // Fall back to global Supabase auth if no siteId
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name },
            },
          });
          
          if (signUpError) throw signUpError;
          
          toast.success('Account created! Check your email to confirm.');
          onSuccess(data.user);
        }
      } else {
        // Login
        if (siteId) {
          const { data, error: authError } = await supabase.functions.invoke('site-auth', {
            body: {
              action: 'login',
              siteId,
              email,
              password,
            },
          });
          
          if (authError) throw new Error(authError.message);
          if (!data?.success) throw new Error(data?.error || 'Login failed');
          
          // Store site session in localStorage
          localStorage.setItem(`site_session:${siteId}`, JSON.stringify(data.session));
          
          toast.success('Welcome back!');
          onSuccess(data.user);
        } else {
          // Fall back to global Supabase auth
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) throw signInError;
          
          toast.success('Welcome back!');
          onSuccess(data.user);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              minLength={6}
            />
          </div>
        </div>
        
        {mode === 'register' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
            {error}
          </div>
        )}
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'register' ? 'Creating account...' : 'Signing in...'}
            </>
          ) : (
            mode === 'register' ? 'Create Account' : 'Sign In'
          )}
        </Button>
      </form>
      
      <div className="text-center text-sm text-muted-foreground">
        {mode === 'register' ? (
          <>
            Already have an account?{' '}
            <button onClick={onModeSwitch} className="text-primary hover:underline">
              Sign in
            </button>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <button onClick={onModeSwitch} className="text-primary hover:underline">
              Create one
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ============ BOOKING OVERLAY ============

interface BookingOverlayProps {
  payload?: Record<string, unknown>;
  businessId?: string;
  onSuccess: (result: unknown) => void;
  onClose: () => void;
}

const BookingOverlay: React.FC<BookingOverlayProps> = ({ payload, businessId, onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const context: IntentContext = {
        businessId,
        payload: {
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          datetime: `${date}T${time}`,
          notes,
          serviceId: payload?.serviceId,
        },
      };

      const result = await executeIntent('booking.create', context);
      
      if (result.ok) {
        toast.success('Booking confirmed! Check your email for details.');
        onSuccess(result);
      } else {
        toast.error(result.error?.message || 'Failed to create booking');
      }
    } catch (err) {
      toast.error('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bookingName">Your Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bookingName"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bookingPhone">Phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bookingPhone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bookingEmail">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="bookingEmail"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bookingDate">Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="bookingDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bookingTime">Time</Label>
          <Input
            id="bookingTime"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bookingNotes">Additional Notes</Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="bookingNotes"
            type="text"
            placeholder="Any special requests..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming booking...
          </>
        ) : (
          'Confirm Booking'
        )}
      </Button>
    </form>
  );
};

// ============ CONTACT/LEAD OVERLAY ============

interface ContactOverlayProps {
  payload?: Record<string, unknown>;
  businessId?: string;
  onSuccess: (result: unknown) => void;
  onClose: () => void;
}

const ContactOverlay: React.FC<ContactOverlayProps> = ({ payload, businessId, onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const context: IntentContext = {
        businessId,
        payload: {
          name,
          email,
          phone,
          message,
          source: (payload?.source as string) || 'contact_form',
        },
      };

      const result = await executeIntent('contact.submit', context);
      
      if (result.ok) {
        toast.success('Message sent! We\'ll be in touch soon.');
        onSuccess(result);
      } else {
        toast.error(result.error?.message || 'Failed to send message');
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contactName">Your Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="contactName"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="contactEmail"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Phone (optional)</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="contactPhone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="contactMessage">Message</Label>
        <textarea
          id="contactMessage"
          placeholder="How can we help you?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
          required
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </Button>
    </form>
  );
};

// ============ CHECKOUT CONFIRMATION OVERLAY ============

interface CheckoutOverlayProps {
  payload?: Record<string, unknown>;
  businessId?: string;
  onSuccess: (result: unknown) => void;
  onClose: () => void;
}

const CheckoutOverlay: React.FC<CheckoutOverlayProps> = ({ payload, businessId, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const context: IntentContext = {
        businessId,
        payload: {
          ...payload,
          customerEmail: email,
        },
      };

      const result = await executeIntent('pay.checkout', context);
      
      if (result.ok && result.ui?.navigate) {
        // Redirect to Stripe checkout
        window.location.href = result.ui.navigate;
        onSuccess(result);
      } else if (result.toast?.type === 'error') {
        toast.error(result.toast.message);
      }
    } catch (err) {
      toast.error('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const items = (payload?.items as Array<{ name?: string; price?: number; quantity?: number }>) || [];
  const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <div className="space-y-2 border-b pb-4">
        <h4 className="font-medium">Order Summary</h4>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name || 'Item'} × {item.quantity || 1}</span>
                <span>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {payload?.planName ? `${payload.planName} Plan` : 'Subscription checkout'}
          </p>
        )}
      </div>
      
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="checkoutEmail">Email for receipt</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="checkoutEmail"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>
      
      {/* Checkout Button */}
      <Button onClick={handleCheckout} className="w-full" disabled={loading || !email}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to checkout...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Proceed to Checkout
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        Secure payment powered by Stripe
      </p>
    </div>
  );
};

// ============ UPGRADE OVERLAY ============

interface UpgradeOverlayProps {
  onClose: () => void;
}

const UpgradeOverlay: React.FC<UpgradeOverlayProps> = ({ onClose }) => {
  return (
    <div className="space-y-4 text-center">
      <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/20 w-fit mx-auto">
        <CreditCard className="h-8 w-8 text-amber-600" />
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium text-lg">Upgrade Required</h4>
        <p className="text-sm text-muted-foreground">
          You've reached your plan limit. Upgrade to continue using this feature.
        </p>
      </div>
      
      <div className="space-y-2">
        <Button className="w-full" onClick={() => {
          window.open('/pricing', '_blank');
          onClose();
        }}>
          View Plans
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Maybe Later
        </Button>
      </div>
    </div>
  );
};

// ============ SUCCESS CONFIRMATION ============

interface ConfirmationOverlayProps {
  title?: string;
  message?: string;
  onClose: () => void;
}

const ConfirmationOverlay: React.FC<ConfirmationOverlayProps> = ({ title, message, onClose }) => {
  return (
    <div className="space-y-4 text-center">
      <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20 w-fit mx-auto">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium text-lg">{title || 'Success!'}</h4>
        <p className="text-sm text-muted-foreground">
          {message || 'Your action was completed successfully.'}
        </p>
      </div>
      
      <Button className="w-full" onClick={onClose}>
        Continue
      </Button>
    </div>
  );
};

// ============ MAIN OVERLAY MANAGER ============

export const PreviewOverlayManager: React.FC<PreviewOverlayManagerProps> = ({
  activeOverlay,
  onClose,
  businessId,
  siteId,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleSuccess = useCallback((result: unknown) => {
    activeOverlay?.onSuccess?.(result);
    onClose();
  }, [activeOverlay, onClose]);

  const handleCancel = useCallback(() => {
    activeOverlay?.onCancel?.();
    onClose();
  }, [activeOverlay, onClose]);

  // Initialize auth mode based on overlay type - must be before conditional return
  React.useEffect(() => {
    if (activeOverlay?.type === 'auth-login') {
      setAuthMode('login');
    } else if (activeOverlay?.type === 'auth-register') {
      setAuthMode('register');
    }
  }, [activeOverlay?.type]);

  if (!activeOverlay) return null;

  const getOverlayTitle = () => {
    switch (activeOverlay.type) {
      case 'auth-login':
        return authMode === 'login' ? 'Sign In' : 'Create Account';
      case 'auth-register':
        return authMode === 'register' ? 'Create Account' : 'Sign In';
      case 'booking':
        return activeOverlay.title || 'Book an Appointment';
      case 'contact':
        return activeOverlay.title || 'Get in Touch';
      case 'checkout':
        return activeOverlay.title || 'Checkout';
      case 'confirmation':
        return activeOverlay.title || 'Success';
      case 'upgrade':
        return 'Upgrade Your Plan';
      default:
        return activeOverlay.title || 'Complete Action';
    }
  };

  const getOverlayDescription = () => {
    switch (activeOverlay.type) {
      case 'auth-login':
      case 'auth-register':
        return authMode === 'login' 
          ? 'Sign in to access your account'
          : 'Create an account to get started';
      case 'booking':
        return activeOverlay.description || 'Select a date and time for your appointment';
      case 'contact':
        return activeOverlay.description || 'We\'ll get back to you as soon as possible';
      case 'checkout':
        return activeOverlay.description || 'Complete your purchase';
      default:
        return activeOverlay.description;
    }
  };

  const renderOverlayContent = () => {
    switch (activeOverlay.type) {
      case 'auth-login':
      case 'auth-register':
        return (
          <AuthOverlay
            mode={authMode}
            siteId={siteId || activeOverlay.siteId}
            businessId={businessId || activeOverlay.businessId}
            onSuccess={handleSuccess}
            onClose={onClose}
            onModeSwitch={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          />
        );
      
      case 'booking':
        return (
          <BookingOverlay
            payload={activeOverlay.payload}
            businessId={businessId || activeOverlay.businessId}
            onSuccess={handleSuccess}
            onClose={onClose}
          />
        );
      
      case 'contact':
        return (
          <ContactOverlay
            payload={activeOverlay.payload}
            businessId={businessId || activeOverlay.businessId}
            onSuccess={handleSuccess}
            onClose={onClose}
          />
        );
      
      case 'checkout':
        return (
          <CheckoutOverlay
            payload={activeOverlay.payload}
            businessId={businessId || activeOverlay.businessId}
            onSuccess={handleSuccess}
            onClose={onClose}
          />
        );
      
      case 'confirmation':
        return (
          <ConfirmationOverlay
            title={activeOverlay.title}
            message={activeOverlay.description}
            onClose={onClose}
          />
        );
      
      case 'upgrade':
        return <UpgradeOverlay onClose={onClose} />;
      
      default:
        return <div>Unknown overlay type</div>;
    }
  };

  return (
    <Dialog open={!!activeOverlay} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {getOverlayTitle()}
          </DialogTitle>
          {getOverlayDescription() && (
            <DialogDescription>
              {getOverlayDescription()}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {renderOverlayContent()}
      </DialogContent>
    </Dialog>
  );
};

export default PreviewOverlayManager;
