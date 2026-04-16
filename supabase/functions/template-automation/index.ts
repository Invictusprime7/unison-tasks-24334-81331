import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { publicCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString, isValidEmail } from "../_shared/validate.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req, publicCorsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, publicCorsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: body, error: parseError } = await safeParseBody<{ action?: string; data?: Record<string, unknown> }>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, publicCorsHeaders);
    }

    const action = sanitizeString(body.action || '', 80);
    const data = body.data && typeof body.data === "object" ? body.data : {};
    console.log(`Template automation action: ${action}`, data);

    switch (action) {
      // CART OPERATIONS
      case 'addToCart': {
        const sessionId = typeof data.sessionId === "string" ? sanitizeString(data.sessionId, 120) : "";
        const productId = typeof data.productId === "string" ? sanitizeString(data.productId, 120) : "";
        const quantity = typeof data.quantity === "number" ? Math.max(1, Math.min(100, Math.trunc(data.quantity))) : 1;
        if (!sessionId || !productId) {
          return errorResponse("sessionId and productId are required", 400, publicCorsHeaders);
        }
        
        // Check if item already in cart
        const { data: existing } = await supabase
          .from('cart_items')
          .select('*')
          .eq('session_id', sessionId)
          .eq('product_id', productId)
          .maybeSingle();

        if (existing) {
          const { data: updated, error } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return secureJsonResponse({ success: true, item: updated }, 200, publicCorsHeaders);
        }

        const { data: newItem, error } = await supabase
          .from('cart_items')
          .insert({ session_id: sessionId, product_id: productId, quantity })
          .select()
          .single();
        if (error) throw error;
        return secureJsonResponse({ success: true, item: newItem }, 200, publicCorsHeaders);
      }

      case 'getCart': {
        const sessionId = typeof data.sessionId === "string" ? sanitizeString(data.sessionId, 120) : "";
        if (!sessionId) {
          return errorResponse("sessionId is required", 400, publicCorsHeaders);
        }
        const { data: items, error } = await supabase
          .from('cart_items')
          .select(`
            *,
            product:products(*)
          `)
          .eq('session_id', sessionId);
        if (error) throw error;
        
        const subtotal = items?.reduce((sum, item) => 
          sum + (item.product?.price || 0) * item.quantity, 0) || 0;
        
        return secureJsonResponse({ 
          success: true, 
          items: items || [], 
          subtotal,
          itemCount: items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        }, 200, publicCorsHeaders);
      }

      case 'updateCartItem': {
        const itemId = typeof data.itemId === "string" ? sanitizeString(data.itemId, 120) : "";
        const quantity = typeof data.quantity === "number" ? Math.max(0, Math.min(100, Math.trunc(data.quantity))) : 0;
        if (!itemId) {
          return errorResponse("itemId is required", 400, publicCorsHeaders);
        }
        if (quantity <= 0) {
          const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('id', itemId);
          if (error) throw error;
        }
        return secureJsonResponse({ success: true }, 200, publicCorsHeaders);
      }

      case 'removeFromCart': {
        const itemId = typeof data.itemId === "string" ? sanitizeString(data.itemId, 120) : "";
        if (!itemId) {
          return errorResponse("itemId is required", 400, publicCorsHeaders);
        }
        const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
        if (error) throw error;
        return secureJsonResponse({ success: true }, 200, publicCorsHeaders);
      }

      case 'clearCart': {
        const sessionId = typeof data.sessionId === "string" ? sanitizeString(data.sessionId, 120) : "";
        if (!sessionId) {
          return errorResponse("sessionId is required", 400, publicCorsHeaders);
        }
        const { error } = await supabase.from('cart_items').delete().eq('session_id', sessionId);
        if (error) throw error;
        return secureJsonResponse({ success: true }, 200, publicCorsHeaders);
      }

      // BOOKING OPERATIONS
      case 'createBooking': {
        const sessionId = typeof data.sessionId === "string" ? sanitizeString(data.sessionId, 120) : "";
        const serviceName = typeof data.serviceName === "string" ? sanitizeString(data.serviceName, 160) : "";
        const customerName = typeof data.customerName === "string" ? sanitizeString(data.customerName, 160) : "";
        const customerEmail = typeof data.customerEmail === "string" ? sanitizeString(data.customerEmail, 254) : "";
        const customerPhone = typeof data.customerPhone === "string" ? sanitizeString(data.customerPhone, 40) : "";
        const bookingDate = typeof data.bookingDate === "string" ? sanitizeString(data.bookingDate, 32) : "";
        const bookingTime = typeof data.bookingTime === "string" ? sanitizeString(data.bookingTime, 16) : "";
        const durationMinutes = typeof data.durationMinutes === "number" ? Math.max(15, Math.min(480, Math.trunc(data.durationMinutes))) : 60;
        const notes = typeof data.notes === "string" ? sanitizeString(data.notes, 1_000) : undefined;
        const ghlCalendarId = typeof data.ghlCalendarId === "string" ? sanitizeString(data.ghlCalendarId, 120) : undefined;
        const locationId = typeof data.locationId === "string" ? sanitizeString(data.locationId, 120) : undefined;

        if (!sessionId || !serviceName || !customerName || !isValidEmail(customerEmail) || !bookingDate || !bookingTime) {
          return errorResponse("Missing or invalid booking fields", 400, publicCorsHeaders);
        }

        // If GHL integration is enabled, create booking there too
        let ghlContactId = null;
        if (locationId) {
          try {
            const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
            if (ghlApiKey) {
              // Create/find contact in GHL
              const contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${ghlApiKey}`,
                  'Content-Type': 'application/json',
                  'Version': '2021-07-28'
                },
                body: JSON.stringify({
                  locationId,
                  email: customerEmail,
                  name: customerName,
                  phone: customerPhone
                })
              });
              const contactData = await contactRes.json();
              ghlContactId = contactData.contact?.id;
              console.log('GHL contact created:', ghlContactId);
            }
          } catch (ghlError) {
            console.error('GHL integration error:', ghlError);
          }
        }

        const { data: booking, error } = await supabase
          .from('bookings')
          .insert({
            session_id: sessionId,
            service_name: serviceName,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            booking_date: bookingDate,
            booking_time: bookingTime,
            duration_minutes: durationMinutes,
            notes,
            ghl_calendar_id: ghlCalendarId,
            ghl_contact_id: ghlContactId,
            status: 'confirmed'
          })
          .select()
          .single();

        if (error) throw error;
        return secureJsonResponse({ success: true, booking }, 200, publicCorsHeaders);
      }

      case 'getAvailableSlots': {
        const date = typeof data.date === "string" ? sanitizeString(data.date, 32) : "";
        if (!date) {
          return errorResponse("date is required", 400, publicCorsHeaders);
        }
        // Generate available time slots (9 AM - 5 PM, hourly)
        const slots = [];
        for (let hour = 9; hour < 17; hour++) {
          const time = `${hour.toString().padStart(2, '0')}:00`;
          
          // Check if slot is already booked
          const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('booking_date', date)
            .eq('booking_time', time)
            .eq('status', 'confirmed')
            .maybeSingle();

          if (!existing) {
            slots.push({
              time,
              available: true,
              label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
            });
          }
        }
        return secureJsonResponse({ success: true, slots }, 200, publicCorsHeaders);
      }

      // ORDER/CHECKOUT OPERATIONS
      case 'createOrder': {
        const sessionId = typeof data.sessionId === "string" ? sanitizeString(data.sessionId, 120) : "";
        const customerEmail = typeof data.customerEmail === "string" ? sanitizeString(data.customerEmail, 254) : "";
        const customerName = typeof data.customerName === "string" ? sanitizeString(data.customerName, 160) : "";
        const shippingAddress = data.shippingAddress ?? null;
        const paymentMethod = typeof data.paymentMethod === "string" ? sanitizeString(data.paymentMethod, 40) : 'card';
        const items = Array.isArray(data.items) ? data.items.slice(0, 100) : [];

        if (!sessionId || !isValidEmail(customerEmail) || !customerName || items.length === 0) {
          return errorResponse("Missing or invalid order fields", 400, publicCorsHeaders);
        }

        const subtotal = items.reduce((sum: number, item: any) => 
          sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + tax;

        const { data: order, error } = await supabase
          .from('orders')
          .insert({
            session_id: sessionId,
            customer_email: customerEmail,
            customer_name: customerName,
            items,
            subtotal,
            tax,
            total,
            shipping_address: shippingAddress,
            payment_method: paymentMethod,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        // Clear cart after order
        await supabase.from('cart_items').delete().eq('session_id', sessionId);

        return secureJsonResponse({ success: true, order }, 200, publicCorsHeaders);
      }

      case 'getOrder': {
        const orderId = typeof data.orderId === "string" ? sanitizeString(data.orderId, 120) : "";
        if (!orderId) {
          return errorResponse("orderId is required", 400, publicCorsHeaders);
        }
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (error) throw error;
        return secureJsonResponse({ success: true, order }, 200, publicCorsHeaders);
      }

      // PRODUCT OPERATIONS
      case 'getProducts': {
        const category = typeof data.category === "string" ? sanitizeString(data.category, 80) : undefined;
        const requestedLimit = typeof data.limit === "number" ? Math.trunc(data.limit) : 50;
        const limit = Math.max(1, Math.min(100, requestedLimit));
        let query = supabase.from('products').select('*').eq('is_active', true);
        if (category) query = query.eq('category', category);
        const { data: products, error } = await query.limit(limit);
        if (error) throw error;
        return secureJsonResponse({ success: true, products: products || [] }, 200, publicCorsHeaders);
      }

      default:
        return errorResponse('Unknown action', 400, publicCorsHeaders);
    }
  } catch (error) {
    console.error('Template automation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500, publicCorsHeaders);
  }
});
