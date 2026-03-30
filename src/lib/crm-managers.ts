/**
 * CRM Managers Implementation
 * 
 * Provides the IntentManagers implementation for CRM operations.
 * Connects the Intent Executor to Supabase for data persistence
 * and Inngest for workflow automation.
 */

import { createClient } from '@supabase/supabase-js';
import type { 
  IntentManagers, 
  LeadData, 
  Pipeline, 
  BookingData, 
  Service,
  CartItem,
  Cart,
  CheckoutOptions
} from '@/runtime/intentExecutor';
import { setupEventBridge, type EventBridgeContext } from './inngest-event-bridge';

// ============ SUPABASE CLIENT ============

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============ STORAGE ============

// In-memory cart storage (in production, use Supabase or localStorage)
const cartStorage = new Map<string, Cart>();

function getOrCreateCart(sessionId: string): Cart {
  if (!cartStorage.has(sessionId)) {
    cartStorage.set(sessionId, {
      id: `cart_${sessionId}`,
      items: [],
      total: 0,
    });
  }
  return cartStorage.get(sessionId)!;
}

// ============ CRM MANAGER ============

function createCRMManager(businessId: string): IntentManagers['crm'] {
  return {
    submitLead: async (data: LeadData) => {
      console.log('[CRM] Submitting lead:', data);
      
      if (supabase) {
        // Get or create default pipeline
        let pipelineId: string | undefined;
        const { data: pipelines } = await supabase
          .from('crm_pipelines')
          .select('id')
          .eq('business_id', businessId)
          .limit(1);
        
        if (pipelines && pipelines.length > 0) {
          pipelineId = pipelines[0].id;
        }

        // Create lead
        const { data: lead, error } = await supabase
          .from('crm_leads')
          .insert({
            business_id: businessId,
            email: data.email,
            phone: data.phone,
            name: data.name,
            source: data.source || 'website',
            pipeline_id: pipelineId,
            metadata: data.metadata,
          })
          .select()
          .single();

        if (error) {
          console.error('[CRM] Failed to create lead:', error);
          throw error;
        }

        return { leadId: lead.id, pipelineId: pipelineId || '' };
      }

      // Fallback for development
      const leadId = `lead_${Date.now()}`;
      console.log('[CRM] Created lead (dev mode):', leadId);
      return { leadId, pipelineId: 'default' };
    },

    getPipeline: async (id?: string) => {
      console.log('[CRM] Getting pipeline:', id);
      
      if (supabase) {
        const query = supabase
          .from('crm_pipelines')
          .select('*, stages:crm_stages(*)')
          .eq('business_id', businessId);
        
        if (id) {
          query.eq('id', id);
        }
        
        const { data: pipelines } = await query.limit(1);
        
        if (pipelines && pipelines.length > 0) {
          const p = pipelines[0];
          return {
            id: p.id,
            name: p.name,
            stages: p.stages?.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) || [],
          };
        }
      }

      return null;
    },

    createDefaultPipeline: async () => {
      console.log('[CRM] Creating default pipeline');
      
      const defaultPipeline: Pipeline = {
        id: `pipeline_${Date.now()}`,
        name: 'Default Pipeline',
        stages: [
          { id: 'new', name: 'New' },
          { id: 'contacted', name: 'Contacted' },
          { id: 'qualified', name: 'Qualified' },
          { id: 'proposal', name: 'Proposal' },
          { id: 'negotiation', name: 'Negotiation' },
          { id: 'closed_won', name: 'Closed Won' },
          { id: 'closed_lost', name: 'Closed Lost' },
        ],
      };

      if (supabase) {
        const { data: pipeline, error } = await supabase
          .from('crm_pipelines')
          .insert({
            business_id: businessId,
            name: defaultPipeline.name,
            is_default: true,
          })
          .select()
          .single();

        if (error) {
          console.error('[CRM] Failed to create pipeline:', error);
          return defaultPipeline;
        }

        // Create stages
        const stages = defaultPipeline.stages.map((s, i) => ({
          pipeline_id: pipeline.id,
          name: s.name,
          position: i,
        }));

        await supabase.from('crm_stages').insert(stages);

        return { ...defaultPipeline, id: pipeline.id };
      }

      return defaultPipeline;
    },
  };
}

// ============ BOOKING MANAGER ============

function createBookingManager(businessId: string): IntentManagers['booking'] {
  return {
    createBooking: async (data: BookingData) => {
      console.log('[Booking] Creating booking:', data);
      
      if (supabase) {
        const { data: booking, error } = await supabase
          .from('bookings')
          .insert({
            business_id: businessId,
            service_id: data.serviceId,
            scheduled_at: data.datetime,
            customer_name: data.customerName,
            customer_email: data.customerEmail,
            customer_phone: data.customerPhone,
            notes: data.notes,
            status: 'pending',
          })
          .select()
          .single();

        if (error) {
          console.error('[Booking] Failed to create:', error);
          throw error;
        }

        return { bookingId: booking.id };
      }

      return { bookingId: `booking_${Date.now()}` };
    },

    getServices: async () => {
      console.log('[Booking] Getting services');
      
      if (supabase) {
        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessId)
          .eq('active', true);

        if (services && services.length > 0) {
          return services.map((s) => ({
            id: s.id,
            name: s.name,
            duration: s.duration_minutes || 60,
            price: s.price,
          }));
        }
      }

      return [];
    },

    createDefaultService: async () => {
      console.log('[Booking] Creating default service');
      
      const defaultService: Service = {
        id: `service_${Date.now()}`,
        name: 'General Appointment',
        duration: 60,
        price: 0,
      };

      if (supabase) {
        const { data: service, error } = await supabase
          .from('services')
          .insert({
            business_id: businessId,
            name: defaultService.name,
            duration_minutes: defaultService.duration,
            price: 0,
            active: true,
          })
          .select()
          .single();

        if (!error && service) {
          return { ...defaultService, id: service.id };
        }
      }

      return defaultService;
    },
  };
}

// ============ CART MANAGER ============

function createCartManager(sessionId: string): IntentManagers['cart'] {
  return {
    add: async (item: CartItem) => {
      const cart = getOrCreateCart(sessionId);
      
      // Check if item exists
      const existingIndex = cart.items.findIndex(i => i.productId === item.productId);
      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity = (cart.items[existingIndex].quantity || 1) + (item.quantity || 1);
      } else {
        cart.items.push(item);
      }
      
      // Recalculate total
      cart.total = cart.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
      
      return { cartId: cart.id, itemCount: cart.items.length };
    },

    get: async () => {
      return cartStorage.get(sessionId) || null;
    },

    checkout: async () => {
      const cart = getOrCreateCart(sessionId);
      // In production, this would create a Stripe checkout session
      return { checkoutUrl: `/checkout?cart=${cart.id}` };
    },
  };
}

// ============ PAYMENTS MANAGER ============

function createPaymentsManager(businessId: string): IntentManagers['payments'] {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  return {
    createCheckout: async (items: CartItem[], options?: CheckoutOptions) => {
      console.log('[Payments] Creating checkout:', items);
      
      // In production, call your Supabase Edge Function
      // which creates a Stripe Checkout Session
      if (supabase) {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            businessId,
            items,
            successUrl: options?.successUrl || `${window.location.origin}/checkout/success`,
            cancelUrl: options?.cancelUrl || `${window.location.origin}/cart`,
            mode: options?.mode || 'payment',
          },
        });

        if (error) {
          console.error('[Payments] Checkout creation failed:', error);
          throw error;
        }

        return { url: data.url };
      }

      // Fallback for development
      return { url: '/checkout/demo' };
    },

    isConfigured: () => {
      return !!stripeKey;
    },

    showSetup: () => {
      console.log('[Payments] Showing setup modal');
      window.postMessage({ type: 'OVERLAY_OPEN', overlayId: 'payments-setup' }, '*');
    },
  };
}

// ============ NEWSLETTER MANAGER ============

function createNewsletterManager(businessId: string): IntentManagers['newsletter'] {
  return {
    subscribe: async (email: string, lists?: string[]) => {
      console.log('[Newsletter] Subscribing:', email, lists);
      
      if (supabase) {
        const { data, error } = await supabase
          .from('newsletter_subscribers')
          .upsert({
            business_id: businessId,
            email,
            lists: lists || ['default'],
            subscribed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('[Newsletter] Subscription failed:', error);
          throw error;
        }

        return { subscriptionId: data.id };
      }

      return { subscriptionId: `sub_${Date.now()}` };
    },
  };
}

// ============ MAIN SETUP ============

export interface CRMManagersConfig {
  businessId: string;
  siteId?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Create fully-configured IntentManagers for CRM operations
 */
export function createCRMManagers(config: CRMManagersConfig): IntentManagers {
  const sessionId = config.sessionId || `session_${Date.now()}`;
  
  return {
    crm: createCRMManager(config.businessId),
    booking: createBookingManager(config.businessId),
    cart: createCartManager(sessionId),
    payments: createPaymentsManager(config.businessId),
    newsletter: createNewsletterManager(config.businessId),
    
    // Navigation manager
    navigation: {
      goto: (path, payload) => {
        console.log('[Nav] Going to:', path);
        window.postMessage({ 
          type: 'NAV_PAGE_GENERATE', 
          pageName: path.replace(/^\/|\.html$/g, ''),
          payload 
        }, '*');
      },
      external: (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      back: () => {
        window.history.back();
      },
      scrollTo: (anchor) => {
        const el = document.querySelector(anchor);
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },

    // Overlay manager
    overlay: {
      open: (id, payload) => {
        console.log('[Overlay] Opening:', id);
        window.postMessage({ type: 'OVERLAY_OPEN', overlayId: id, payload }, '*');
      },
      close: (id) => {
        window.postMessage({ type: 'OVERLAY_CLOSE', overlayId: id }, '*');
      },
      isOpen: () => false,
    },

    // Toast manager
    toast: {
      show: (toast) => {
        console.log('[Toast]', toast.type, toast.message);
        window.postMessage({ type: 'TOAST_SHOW', toast }, '*');
      },
    },

    // Auth manager (placeholder - connect to your auth system)
    auth: {
      isAuthenticated: () => false,
      getCurrentUser: () => null,
      showLogin: () => {
        window.postMessage({ type: 'OVERLAY_OPEN', overlayId: 'auth-login' }, '*');
      },
      showRegister: () => {
        window.postMessage({ type: 'OVERLAY_OPEN', overlayId: 'auth-register' }, '*');
      },
    },
  };
}

/**
 * Initialize the full CRM + Automation system
 * 
 * Call this once at app startup:
 * ```ts
 * import { initializeCRMSystem } from '@/lib/crm-managers';
 * 
 * initializeCRMSystem({
 *   businessId: 'my-business-id',
 *   siteId: 'my-site-id',
 * });
 * ```
 */
export function initializeCRMSystem(config: CRMManagersConfig): void {
  // Create managers
  const managers = createCRMManagers(config);
  
  // Configure the intent executor with managers
  import('@/runtime/intentExecutor').then(({ configureIntentExecutor }) => {
    configureIntentExecutor(managers);
    console.log('[CRM] Intent Executor configured with CRM managers');
  });

  // Setup event bridge to Inngest
  const eventBridgeContext: EventBridgeContext = {
    businessId: config.businessId,
    siteId: config.siteId,
    userId: config.userId,
    sessionId: config.sessionId,
  };
  setupEventBridge(eventBridgeContext);
  
  console.log('[CRM] System initialized for business:', config.businessId);
}
