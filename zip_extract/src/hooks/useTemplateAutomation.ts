import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Generate or retrieve session ID for anonymous users
const getSessionId = () => {
  let sessionId = localStorage.getItem('template_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('template_session_id', sessionId);
  }
  return sessionId;
};

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    description?: string;
  };
}

interface Booking {
  id: string;
  service_name: string;
  customer_name: string;
  customer_email: string;
  booking_date: string;
  booking_time: string;
  status: string;
}

interface Order {
  id: string;
  customer_email: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

export const useTemplateAutomation = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const sessionId = getSessionId();

  const callAutomation = async (action: string, data: any) => {
    const { data: result, error } = await supabase.functions.invoke('template-automation', {
      body: { action, data: { ...data, sessionId } }
    });
    if (error) throw error;
    return result;
  };

  // CART OPERATIONS
  const fetchCart = useCallback(async () => {
    try {
      const result = await callAutomation('getCart', {});
      setCart(result.items || []);
      setCartTotal(result.subtotal || 0);
      setCartCount(result.itemCount || 0);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, [sessionId]);

  const addToCart = async (productId: string, quantity = 1) => {
    setLoading(true);
    try {
      await callAutomation('addToCart', { productId, quantity });
      await fetchCart();
      toast.success('Added to cart!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      await callAutomation('updateCartItem', { itemId, quantity });
      await fetchCart();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update cart');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    setLoading(true);
    try {
      await callAutomation('removeFromCart', { itemId });
      await fetchCart();
      toast.success('Removed from cart');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove from cart');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      await callAutomation('clearCart', {});
      await fetchCart();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear cart');
    } finally {
      setLoading(false);
    }
  };

  // BOOKING OPERATIONS
  const createBooking = async (bookingData: {
    serviceName: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    bookingDate: string;
    bookingTime: string;
    durationMinutes?: number;
    notes?: string;
    ghlCalendarId?: string;
    locationId?: string;
  }): Promise<Booking | null> => {
    setLoading(true);
    try {
      const result = await callAutomation('createBooking', bookingData);
      toast.success('Booking confirmed!');
      return result.booking;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSlots = async (date: string, serviceDuration = 60) => {
    try {
      const result = await callAutomation('getAvailableSlots', { date, serviceDuration });
      return result.slots || [];
    } catch (error) {
      console.error('Error fetching slots:', error);
      return [];
    }
  };

  // ORDER OPERATIONS
  const createOrder = async (orderData: {
    customerEmail: string;
    customerName?: string;
    shippingAddress?: any;
    paymentMethod?: string;
  }): Promise<Order | null> => {
    setLoading(true);
    try {
      const items = cart.map(item => ({
        productId: item.product_id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      }));
      
      const result = await callAutomation('createOrder', { ...orderData, items });
      toast.success('Order placed successfully!');
      await fetchCart(); // Clear cart state
      return result.order;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // PRODUCT OPERATIONS
  const getProducts = async (category?: string) => {
    try {
      const result = await callAutomation('getProducts', { category });
      return result.products || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  };

  // Load cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    // Cart
    cart,
    cartTotal,
    cartCount,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCart,
    // Bookings
    createBooking,
    getAvailableSlots,
    // Orders
    createOrder,
    // Products
    getProducts,
    // State
    loading,
    sessionId
  };
};
