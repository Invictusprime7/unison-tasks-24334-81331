import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!apiKey) {
      console.error('GOHIGHLEVEL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GoHighLevel API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, contactId, locationId, customFields } = await req.json();
    console.log(`GHL CRM action: ${action}, contactId: ${contactId}, locationId: ${locationId}`);

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };

    let result;

    switch (action) {
      case 'getContact': {
        if (!contactId) {
          return new Response(
            JSON.stringify({ error: 'contactId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('GHL API error:', response.status, errorText);
          throw new Error(`Failed to fetch contact: ${response.status}`);
        }
        result = await response.json();
        break;
      }

      case 'getContacts': {
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'locationId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const response = await fetch(`${GHL_API_BASE}/contacts/?locationId=${locationId}`, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('GHL API error:', response.status, errorText);
          throw new Error(`Failed to fetch contacts: ${response.status}`);
        }
        result = await response.json();
        break;
      }

      case 'getCustomFields': {
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'locationId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const response = await fetch(`${GHL_API_BASE}/locations/${locationId}/customFields`, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('GHL API error:', response.status, errorText);
          throw new Error(`Failed to fetch custom fields: ${response.status}`);
        }
        result = await response.json();
        break;
      }

      case 'getLocation': {
        if (!locationId) {
          return new Response(
            JSON.stringify({ error: 'locationId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const response = await fetch(`${GHL_API_BASE}/locations/${locationId}`, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('GHL API error:', response.status, errorText);
          throw new Error(`Failed to fetch location: ${response.status}`);
        }
        result = await response.json();
        break;
      }

      case 'getTemplateData': {
        // Fetch all data needed for template personalization
        if (!contactId && !locationId) {
          return new Response(
            JSON.stringify({ error: 'contactId or locationId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const templateData: Record<string, unknown> = {};

        // Fetch contact data if contactId provided
        if (contactId) {
          const contactResponse = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, { headers });
          if (contactResponse.ok) {
            const contactData = await contactResponse.json();
            templateData.contact = contactData.contact;
            templateData.customFieldValues = contactData.contact?.customFields || [];
          }
        }

        // Fetch location/business data if locationId provided
        if (locationId) {
          const locationResponse = await fetch(`${GHL_API_BASE}/locations/${locationId}`, { headers });
          if (locationResponse.ok) {
            const locationData = await locationResponse.json();
            templateData.location = locationData.location;
            templateData.businessName = locationData.location?.name;
            templateData.businessAddress = locationData.location?.address;
            templateData.businessPhone = locationData.location?.phone;
            templateData.businessEmail = locationData.location?.email;
            templateData.businessLogo = locationData.location?.logoUrl;
          }

          // Fetch custom field definitions
          const fieldsResponse = await fetch(`${GHL_API_BASE}/locations/${locationId}/customFields`, { headers });
          if (fieldsResponse.ok) {
            const fieldsData = await fieldsResponse.json();
            templateData.customFieldDefinitions = fieldsData.customFields;
          }
        }

        result = templateData;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`GHL CRM action ${action} completed successfully`);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('GHL CRM error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
