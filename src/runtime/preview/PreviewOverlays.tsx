/**
 * PreviewOverlays - Mock overlay components for preview runtime
 * 
 * These provide visual feedback for intents without real backend calls.
 * In production, these would be replaced with real components.
 */

import React, { useState, useCallback } from 'react';
import { usePreviewRuntime } from './usePreviewRuntime';

// ============================================================================
// Overlay Container
// ============================================================================

export const OverlayContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { overlayState, closeOverlay } = usePreviewRuntime();
  
  if (!overlayState.active) return <>{children}</>;
  
  return (
    <>
      {children}
      
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
        onClick={() => closeOverlay()}
      />
      
      {/* Overlay content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <OverlayRouter type={overlayState.active} payload={overlayState.payload} />
      </div>
    </>
  );
};

// ============================================================================
// Overlay Router
// ============================================================================

interface OverlayRouterProps {
  type: string;
  payload: Record<string, unknown>;
}

const OverlayRouter: React.FC<OverlayRouterProps> = ({ type, payload }) => {
  switch (type) {
    case 'cart':
      return <CartOverlay />;
    case 'auth':
      return <AuthOverlay mode={(payload.mode as 'login' | 'register') || 'login'} />;
    case 'booking':
      return <BookingOverlay service={payload.service as string} />;
    case 'contact':
      return <ContactOverlay />;
    default:
      return <GenericOverlay type={type} payload={payload} />;
  }
};

// ============================================================================
// Cart Overlay
// ============================================================================

const CartOverlay: React.FC = () => {
  const { closeOverlay, cmsState, removeFromCart, clearCart, executeIntent } = usePreviewRuntime();
  
  const handleCheckout = useCallback(async () => {
    closeOverlay();
    await executeIntent('pay.checkout', { items: cmsState.cart.items });
  }, [closeOverlay, executeIntent, cmsState.cart.items]);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Shopping Cart</h2>
        <button onClick={() => closeOverlay()} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {cmsState.cart.items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Your cart is empty</p>
        ) : (
          <div className="space-y-4">
            {cmsState.cart.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {cmsState.cart.items.length > 0 && (
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${cmsState.cart.total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Clear
            </button>
            <button
              onClick={handleCheckout}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Checkout
            </button>
          </div>
          <p className="text-xs text-center text-gray-500">
            (Preview mode - no payment processed)
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Auth Overlay
// ============================================================================

interface AuthOverlayProps {
  mode: 'login' | 'register';
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ mode: initialMode }) => {
  const { closeOverlay, executeIntent } = usePreviewRuntime();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    const intent = mode === 'login' ? 'auth.signin' : 'auth.signup';
    const result = await executeIntent(intent, { email, password });
    
    setIsLoading(false);
    
    if (result.ok) {
      setMessage(mode === 'login' ? 'Login successful!' : 'Account created!');
      setTimeout(() => closeOverlay(), 1000);
    } else {
      setMessage(result.error?.message || 'An error occurred');
    }
  }, [mode, email, password, executeIntent, closeOverlay]);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <button onClick={() => closeOverlay()} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="you@example.com"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="••••••••"
            required
          />
        </div>
        
        {message && (
          <p className={`text-sm ${message.includes('successful') || message.includes('created') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
        </button>
        
        <p className="text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-primary hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
        
        <p className="text-xs text-center text-gray-400">
          (Preview mode - simulated auth)
        </p>
      </form>
    </div>
  );
};

// ============================================================================
// Booking Overlay
// ============================================================================

interface BookingOverlayProps {
  service?: string;
}

const BookingOverlay: React.FC<BookingOverlayProps> = ({ service }) => {
  const { closeOverlay, executeIntent } = usePreviewRuntime();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await executeIntent('booking.confirm', {
      service,
      date: selectedDate,
      time: selectedTime,
      name,
      email,
    });
    
    setIsLoading(false);
    setIsBooked(true);
  }, [service, selectedDate, selectedTime, name, email, executeIntent]);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Book {service || 'Appointment'}
        </h2>
        <button onClick={() => closeOverlay()} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      
      {isBooked ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
          <p className="text-gray-500 mb-4">
            {selectedDate} at {selectedTime}
          </p>
          <p className="text-xs text-gray-400">
            (Preview mode - simulated booking)
          </p>
          <button
            onClick={() => closeOverlay()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select time</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </form>
      )}
    </div>
  );
};

// ============================================================================
// Contact Overlay
// ============================================================================

const ContactOverlay: React.FC = () => {
  const { closeOverlay, submitForm } = usePreviewRuntime();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await submitForm('contact', { name, email, message });
    
    setIsLoading(false);
    setIsSubmitted(true);
  }, [name, email, message, submitForm]);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Contact Us</h2>
        <button onClick={() => closeOverlay()} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      
      {isSubmitted ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">📬</div>
          <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
          <p className="text-gray-500 mb-4">We'll get back to you soon.</p>
          <p className="text-xs text-gray-400">(Preview mode - simulated submission)</p>
          <button
            onClick={() => closeOverlay()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );
};

// ============================================================================
// Generic Overlay
// ============================================================================

interface GenericOverlayProps {
  type: string;
  payload: Record<string, unknown>;
}

const GenericOverlay: React.FC<GenericOverlayProps> = ({ type, payload }) => {
  const { closeOverlay } = usePreviewRuntime();
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold capitalize">{type.replace(/[_-]/g, ' ')}</h2>
        <button onClick={() => closeOverlay()} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
      
      <div className="p-4">
        <p className="text-gray-500 mb-4">
          This overlay type ({type}) is not yet implemented in preview mode.
        </p>
        {Object.keys(payload).length > 0 && (
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </div>
      
      <div className="p-4 border-t">
        <button
          onClick={() => closeOverlay()}
          className="w-full px-4 py-2 bg-primary text-white rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default OverlayContainer;
