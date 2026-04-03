import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();
    console.log(`Template automation action: ${action}`, data);

    switch (action) {
      // CART OPERATIONS
      case 'addToCart': {
        const { sessionId, productId, quantity = 1 } = data;
        
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
          return new Response(JSON.stringify({ success: true, item: updated }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: newItem, error } = await supabase
          .from('cart_items')
          .insert({ session_id: sessionId, product_id: productId, quantity })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, item: newItem }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getCart': {
        const { sessionId } = data;
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
        
        return new Response(JSON.stringify({ 
          success: true, 
          items: items || [], 
          subtotal,
          itemCount: items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateCartItem': {
        const { itemId, quantity } = data;
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
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'removeFromCart': {
        const { itemId } = data;
        const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'clearCart': {
        const { sessionId } = data;
        const { error } = await supabase.from('cart_items').delete().eq('session_id', sessionId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // BOOKING OPERATIONS
      case 'createBooking': {
        const { 
          sessionId, 
          serviceName, 
          customerName, 
          customerEmail, 
          customerPhone,
          bookingDate, 
          bookingTime, 
          durationMinutes = 60,
          notes,
          ghlCalendarId,
          locationId
        } = data;

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
        return new Response(JSON.stringify({ success: true, booking }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getAvailableSlots': {
        const { date, serviceDuration = 60 } = data;
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
        return new Response(JSON.stringify({ success: true, slots }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ORDER/CHECKOUT OPERATIONS
      case 'createOrder': {
        const { 
          sessionId, 
          customerEmail, 
          customerName,
          items,
          shippingAddress,
          paymentMethod = 'card'
        } = data;

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

        return new Response(JSON.stringify({ success: true, order }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getOrder': {
        const { orderId } = data;
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, order }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // PRODUCT OPERATIONS
      case 'getProducts': {
        const { category, limit = 50 } = data || {};
        let query = supabase.from('products').select('*').eq('is_active', true);
        if (category) query = query.eq('category', category);
        const { data: products, error } = await query.limit(limit);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, products: products || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Template automation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
