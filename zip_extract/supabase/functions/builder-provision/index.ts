// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Builder - Provision Endpoint
 * POST /builder-provision
 * 
 * Takes a Business Blueprint and provisions a complete project:
 * - Creates project record
 * - Creates business entity
 * - Seeds CRM objects
 * - Creates intent bindings
 * - Creates automation workflows
 * - Generates initial files/templates
 */

interface ProvisionRequest {
  owner_id: string;
  blueprint: {
    version: string;
    identity: {
      industry: string;
      business_model: string;
      primary_goal: string;
      locale?: string;
      region?: string;
      timezone?: string;
    };
    brand: {
      business_name: string;
      tagline?: string;
      tone: string;
      palette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
      };
      typography: {
        heading: string;
        body: string;
      };
      logo: {
        mode: string;
        url?: string;
        text_lockup?: string;
      };
    };
    site: {
      pages: Array<{
        id: string;
        type: string;
        title: string;
        path: string;
        sections: Array<{
          id: string;
          type: string;
          props: Record<string, unknown>;
        }>;
        required_capabilities: string[];
      }>;
      navigation: Array<{
        label: string;
        path: string;
      }>;
    };
    intents: Array<{
      intent: string;
      target: {
        kind: string;
        ref: string;
      };
      payload_schema: Array<{
        key: string;
        label: string;
        type: string;
        required: boolean;
        options?: string[];
      }>;
    }>;
    crm: {
      objects: Array<{
        name: string;
        fields: Array<{
          key: string;
          type: string;
          required: boolean;
        }>;
      }>;
      pipelines: Array<{
        pipeline_id: string;
        label: string;
        stages: Array<{
          id: string;
          label: string;
          order: number;
        }>;
      }>;
    };
    automations: {
      provision_mode: string;
      rules: Array<{
        id: string;
        name: string;
        trigger: string;
        conditions: unknown[];
        actions: Array<{
          type: string;
          params: Record<string, unknown>;
        }>;
        enabled_by_default: boolean;
      }>;
    };
    guarantees: {
      buttons_wired: boolean;
      automations_ready: boolean;
      forms_connected_to_crm: boolean;
    };
  };
  options?: {
    create_demo_content?: boolean;
    provision_mode?: string;
  };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

function generatePageHTML(page: ProvisionRequest["blueprint"]["site"]["pages"][0], brand: ProvisionRequest["blueprint"]["brand"]): string {
  const sections = page.sections.map(section => {
    switch (section.type) {
      case "hero":
        return `
    <!-- Hero Section -->
    <section class="relative py-20 px-4 bg-gradient-to-br from-[${brand.palette.primary}]/10 to-[${brand.palette.secondary}]/10">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-6xl font-bold mb-6 text-[${brand.palette.foreground}]">${section.props.headline || brand.business_name}</h1>
        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">${section.props.subheadline || brand.tagline || "Welcome to our business"}</p>
        <div class="flex gap-4 justify-center">
          <button data-ut-intent="booking.create" class="px-8 py-3 bg-[${brand.palette.primary}] text-white rounded-lg font-semibold hover:opacity-90 transition">Book Now</button>
          <button data-ut-intent="lead.capture" class="px-8 py-3 border-2 border-[${brand.palette.primary}] text-[${brand.palette.primary}] rounded-lg font-semibold hover:bg-[${brand.palette.primary}]/10 transition">Get Quote</button>
        </div>
      </div>
    </section>`;
      
      case "features":
        return `
    <!-- Features Section -->
    <section class="py-16 px-4">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">${section.props.title || "Why Choose Us"}</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center p-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-[${brand.palette.primary}]/10 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-[${brand.palette.primary}]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Quality Service</h3>
            <p class="text-gray-600">We deliver excellence in everything we do.</p>
          </div>
          <div class="text-center p-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-[${brand.palette.primary}]/10 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-[${brand.palette.primary}]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Fast Response</h3>
            <p class="text-gray-600">Quick turnaround on all requests.</p>
          </div>
          <div class="text-center p-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-[${brand.palette.primary}]/10 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-[${brand.palette.primary}]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Expert Team</h3>
            <p class="text-gray-600">Skilled professionals at your service.</p>
          </div>
        </div>
      </div>
    </section>`;
      
      case "cta":
        return `
    <!-- CTA Section -->
    <section class="py-16 px-4 bg-[${brand.palette.primary}]">
      <div class="max-w-4xl mx-auto text-center text-white">
        <h2 class="text-3xl font-bold mb-4">${section.props.title || "Ready to Get Started?"}</h2>
        <p class="text-xl mb-8 opacity-90">Contact us today and let's discuss your needs.</p>
        <button data-ut-intent="contact.submit" class="px-8 py-3 bg-white text-[${brand.palette.primary}] rounded-lg font-semibold hover:bg-gray-100 transition">${section.props.buttonText || "Contact Us"}</button>
      </div>
    </section>`;
      
      case "page_header":
        return `
    <!-- Page Header -->
    <section class="py-16 px-4 bg-gradient-to-r from-[${brand.palette.primary}]/10 to-[${brand.palette.secondary}]/10">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl font-bold text-[${brand.palette.foreground}]">${section.props.title || page.title}</h1>
      </div>
    </section>`;
      
      case "contact_form":
        return `
    <!-- Contact Form -->
    <section class="py-16 px-4">
      <div class="max-w-2xl mx-auto">
        <form data-ut-intent="contact.submit" class="space-y-6">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Name</label>
              <input type="text" name="name" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Email</label>
              <input type="email" name="email" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Phone</label>
            <input type="tel" name="phone" class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Message</label>
            <textarea name="message" rows="4" class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent"></textarea>
          </div>
          <button type="submit" class="w-full py-3 bg-[${brand.palette.primary}] text-white rounded-lg font-semibold hover:opacity-90 transition">Send Message</button>
        </form>
      </div>
    </section>`;
      
      case "booking_form":
        return `
    <!-- Booking Form -->
    <section class="py-16 px-4">
      <div class="max-w-2xl mx-auto">
        <form data-ut-intent="booking.create" class="space-y-6">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Name</label>
              <input type="text" name="name" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Email</label>
              <input type="email" name="email" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Phone</label>
              <input type="tel" name="phone" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Service</label>
              <select name="service" class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent">
                <option>Select a service</option>
                <option>General Consultation</option>
                <option>Full Service</option>
              </select>
            </div>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Preferred Date</label>
              <input type="date" name="date" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Preferred Time</label>
              <input type="time" name="time" required class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Additional Notes</label>
            <textarea name="notes" rows="3" class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[${brand.palette.primary}] focus:border-transparent"></textarea>
          </div>
          <button type="submit" class="w-full py-3 bg-[${brand.palette.primary}] text-white rounded-lg font-semibold hover:opacity-90 transition">Book Appointment</button>
        </form>
      </div>
    </section>`;
      
      default:
        return `
    <!-- ${section.type} Section -->
    <section class="py-16 px-4">
      <div class="max-w-6xl mx-auto">
        <p class="text-center text-gray-600">${section.type} content will be generated here.</p>
      </div>
    </section>`;
    }
  }).join("\n");

  // Generate navigation
  const nav = `
    <!-- Navigation -->
    <nav class="bg-white shadow-sm sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/" class="text-2xl font-bold text-[${brand.palette.primary}]">${brand.business_name}</a>
        <div class="hidden md:flex gap-6">
          ${brand.logo.text_lockup ? '' : ''}
        </div>
        <button data-ut-intent="booking.create" class="px-4 py-2 bg-[${brand.palette.primary}] text-white rounded-lg font-medium hover:opacity-90 transition">Book Now</button>
      </div>
    </nav>`;

  // Generate footer
  const footer = `
    <!-- Footer -->
    <footer class="bg-[${brand.palette.foreground}] text-white py-12 px-4">
      <div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <h3 class="text-xl font-bold mb-4">${brand.business_name}</h3>
          <p class="text-gray-300">${brand.tagline || "Quality service you can trust"}</p>
        </div>
        <div>
          <h4 class="font-semibold mb-4">Quick Links</h4>
          <ul class="space-y-2 text-gray-300">
            <li><a href="/" class="hover:text-white transition">Home</a></li>
            <li><a href="/services" class="hover:text-white transition">Services</a></li>
            <li><a href="/contact" class="hover:text-white transition">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-4">Contact</h4>
          <div class="space-y-2 text-gray-300">
            <button data-ut-intent="call.now" class="flex items-center gap-2 hover:text-white transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              Call Us
            </button>
            <button data-ut-intent="contact.submit" class="flex items-center gap-2 hover:text-white transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              Email Us
            </button>
          </div>
        </div>
      </div>
      <div class="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
        <p>&copy; ${new Date().getFullYear()} ${brand.business_name}. All rights reserved.</p>
      </div>
    </footer>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title} | ${brand.business_name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${brand.typography.heading.replace(' ', '+')}:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: '${brand.typography.body}', sans-serif; }
    h1, h2, h3, h4, h5, h6 { font-family: '${brand.typography.heading}', sans-serif; }
  </style>
</head>
<body class="bg-[${brand.palette.background}] text-[${brand.palette.foreground}]">
${nav}
${sections}
${footer}

  <!-- Unison Tasks Intent Runtime -->
  <script>
    document.querySelectorAll('[data-ut-intent]').forEach(el => {
      const intent = el.getAttribute('data-ut-intent');
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        const form = el.closest('form');
        const data = form ? Object.fromEntries(new FormData(form)) : {};
        
        try {
          const response = await fetch('/api/intent-router', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intent, payload: data }),
          });
          
          if (response.ok) {
            if (form) form.reset();
            alert('Success! We will be in touch soon.');
          } else {
            alert('Something went wrong. Please try again.');
          }
        } catch (error) {
          console.error('Intent error:', error);
          alert('Something went wrong. Please try again.');
        }
      });
    });
  </script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      return json(401, { error: "Unauthorized" });
    }

    const body: ProvisionRequest = await req.json();
    
    if (!body.blueprint) {
      return json(400, { error: "blueprint is required" });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const blueprint = body.blueprint;
    const ownerId = body.owner_id || user.id;

    // Step 1: Create business entity
    const businessSlug = generateSlug(blueprint.brand.business_name);
    const { data: business, error: businessError } = await adminClient
      .from("businesses")
      .insert({
        user_id: ownerId,
        name: blueprint.brand.business_name,
        slug: businessSlug,
        business_type: blueprint.identity.industry,
        settings: {
          brand: blueprint.brand,
          identity: blueprint.identity,
        },
      })
      .select()
      .single();

    if (businessError) {
      console.error("[builder-provision] Business creation failed:", businessError);
      return json(500, { error: "Failed to create business" });
    }

    // Step 2: Create design preferences
    await adminClient.from("business_design_preferences").upsert({
      business_id: business.id,
      color_primary: blueprint.brand.palette.primary,
      color_secondary: blueprint.brand.palette.secondary,
      color_accent: blueprint.brand.palette.accent,
      font_heading: blueprint.brand.typography.heading,
      font_body: blueprint.brand.typography.body,
    });

    // Step 3: Create project/template with generated HTML
    const homePageHtml = generatePageHTML(
      blueprint.site.pages.find(p => p.type === "home") || blueprint.site.pages[0],
      blueprint.brand
    );

    const { data: template, error: templateError } = await adminClient
      .from("design_templates")
      .insert({
        user_id: ownerId,
        name: blueprint.brand.business_name,
        description: blueprint.brand.tagline || `${blueprint.identity.industry} website`,
        is_public: false,
        canvas_data: {
          html: homePageHtml,
          previewCode: homePageHtml,
          blueprint: blueprint,
        },
      })
      .select()
      .single();

    if (templateError) {
      console.error("[builder-provision] Template creation failed:", templateError);
      return json(500, { error: "Failed to create template" });
    }

    // Step 4: Create intent bindings
    for (const intent of blueprint.intents) {
      await adminClient.from("intent_bindings").insert({
        business_id: business.id,
        intent: intent.intent,
        handler: intent.target.ref,
        payload_schema: intent.payload_schema,
        enabled: true,
      });
    }

    // Step 5: Create CRM pipeline stages
    for (const pipeline of blueprint.crm.pipelines) {
      for (const stage of pipeline.stages) {
        await adminClient.from("crm_pipeline_stages").insert({
          business_id: business.id,
          pipeline_id: pipeline.pipeline_id,
          stage_id: stage.id,
          label: stage.label,
          position: stage.order,
        });
      }
    }

    // Step 6: Create automation workflows
    const isShadowMode = (body.options?.provision_mode || blueprint.automations.provision_mode) === "shadow_automations";
    
    for (const rule of blueprint.automations.rules) {
      await adminClient.from("automation_recipes").insert({
        business_id: business.id,
        name: rule.name,
        trigger_event: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        is_active: rule.enabled_by_default && !isShadowMode,
        is_shadow: isShadowMode,
      });
    }

    // Step 7: Update project status
    await adminClient.from("projects").upsert({
      id: template.id,
      owner_id: ownerId,
      name: blueprint.brand.business_name,
      description: blueprint.brand.tagline,
      blueprint_id: business.id,
      status: "ready",
    });

    return json(200, {
      project_id: template.id,
      business_id: business.id,
      builder_url: `/web-builder?id=${template.id}`,
      provisioning: {
        status: "ready",
        steps: ["create_business", "create_template", "create_intents", "create_pipeline", "create_workflows"],
      },
    });
  } catch (error) {
    console.error("[builder-provision] Error:", error);
    return json(500, { error: "Internal server error" });
  }
});
