const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequestBody {
  provider: 'netlify' | 'vercel';
  siteName?: string;
  customDomain?: string;
  files: {
    [path: string]: string; // path -> content (utf-8)
  };
}

interface PublishResponse {
  status: 'success' | 'error';
  url?: string;
  dashboardUrl?: string;
  provider: string;
  note?: string;
  error?: string;
  isLocalDevelopment?: boolean;
}

// Utility: very small HTML sanitizer for safety on logging only
function sanitizeLogPreview(input: string) {
  return input.replace(/[\r\n\t]/g, ' ').slice(0, 200);
}

// Move function declarations to root level to fix linting issues
async function netlifyApi(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Netlify API ${path} failed: ${res.status} ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

function sanitizeSiteName(name: string) {
  const s = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  return s || `site-${Math.random().toString(36).slice(2, 8)}`;
}

async function generateSha1Hash(input: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-1', bytes);
  const view = new Uint8Array(hash);
  return Array.from(view).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as PublishRequestBody;
    const provider = body.provider;

    // Provider tokens from environment
    const NETLIFY_AUTH_TOKEN = Deno.env.get('NETLIFY_AUTH_TOKEN');
    const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN');

    // Basic validation
    if (!body.files || Object.keys(body.files).length === 0) {
      return new Response(
        JSON.stringify({ status: 'error', provider, error: 'No files provided' } as PublishResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Log a tiny preview for debugging
    const indexHtmlPreview = body.files['index.html'] ? sanitizeLogPreview(body.files['index.html']) : 'no index.html';
    console.log('[publish-site] provider=%s siteName=%s customDomain=%s indexPreview=%s', provider, body.siteName, body.customDomain, indexHtmlPreview);

    // LOCAL DEVELOPMENT: return a mock URL and guidance
    if (!NETLIFY_AUTH_TOKEN && !VERCEL_TOKEN) {
      return new Response(
        JSON.stringify({
          status: 'success',
          provider,
          url: `https://preview.local/${body.siteName || 'my-site'}`,
          dashboardUrl: 'https://example.com/dashboard',
          note: 'Mock publish successful (local dev). Configure NETLIFY_AUTH_TOKEN or VERCEL_TOKEN in Supabase to enable real deployments.',
          isLocalDevelopment: true,
        } as PublishResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // NETLIFY: Real deploy flow using REST API
    if (provider === 'netlify') {
      if (!NETLIFY_AUTH_TOKEN) {
        return new Response(
          JSON.stringify({ status: 'error', provider, error: 'Missing NETLIFY_AUTH_TOKEN in environment' } as PublishResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const headers = {
        'Authorization': `Bearer ${NETLIFY_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      } as const;

      const desiredName = sanitizeSiteName(body.siteName || 'my-site');

      // Step 1: Ensure site exists (create if needed)
      let siteId: string | null = Deno.env.get('NETLIFY_SITE_ID') || null;
      let siteAdminUrl: string | null = null;
      let siteUrl: string | null = null;

      if (!siteId) {
        // Try to create site with desired name; if taken, append random suffix
        let finalName = desiredName;
        let created: { id: string; admin_url?: string; ssl_url?: string; url?: string } | null = null;
        for (let i = 0; i < 2; i++) {
          try {
            created = await netlifyApi('/sites', NETLIFY_AUTH_TOKEN, {
              method: 'POST',
              headers,
              body: JSON.stringify({ name: finalName }),
            }) as { id: string; admin_url?: string; ssl_url?: string; url?: string };
            break;
          } catch (e) {
            // Name may be taken; try once with random suffix
            if (i === 0) {
              finalName = `${desiredName}-${Math.random().toString(36).slice(2, 6)}`;
              continue;
            }
            throw e;
          }
        }
        siteId = created!.id;
        siteAdminUrl = created!.admin_url || null;
        siteUrl = created!.ssl_url || created!.url || null;
      } else {
        const s = await netlifyApi(`/sites/${siteId}`, NETLIFY_AUTH_TOKEN) as { admin_url?: string; ssl_url?: string; url?: string };
        siteAdminUrl = s.admin_url || null;
        siteUrl = s.ssl_url || s.url || null;
      }

      // Step 2: Create deploy with file SHA-1 map
      const files = body.files;
      const encoder = new TextEncoder();

      const fileShaMap: Record<string, string> = {};
      for (const [path, content] of Object.entries(files)) {
        const norm = path.replace(/^\/+/, '');
        fileShaMap[norm] = await generateSha1Hash(content);
      }

      const deployInit = await netlifyApi(`/sites/${siteId}/deploys`, NETLIFY_AUTH_TOKEN, {
        method: 'POST',
        headers,
        body: JSON.stringify({ files: fileShaMap, draft: false }),
      }) as { id: string; required?: string[] };

      const deployId: string = deployInit.id;
      const required: string[] = Array.isArray(deployInit.required) ? deployInit.required : [];

      // Step 3: Upload required files
      for (const reqPath of required) {
        const norm = reqPath.replace(/^\/+/, '');
        const content = files[norm];
        if (typeof content !== 'string') continue; // skip unknown
        const uploadRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/files/${encodeURIComponent(norm)}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${NETLIFY_AUTH_TOKEN}`, 'Content-Type': 'application/octet-stream' },
          body: encoder.encode(content),
        });
        if (!uploadRes.ok) {
          const t = await uploadRes.text().catch(() => '');
          throw new Error(`Upload failed for ${norm}: ${uploadRes.status} ${t}`);
        }
      }

      // Step 4: Poll deploy until ready (timeout ~20s)
      let deployUrl: string | null = null;
      let state = 'new';
      const start = Date.now();
      while (Date.now() - start < 20000) {
        const d = await netlifyApi(`/deploys/${deployId}`, NETLIFY_AUTH_TOKEN) as { state: string; deploy_ssl_url?: string; deploy_url?: string };
        state = d.state;
        deployUrl = d.deploy_ssl_url || d.deploy_url || null;
        if (state === 'ready') break;
        await new Promise(r => setTimeout(r, 1500));
      }

      const resultUrl = deployUrl || siteUrl || undefined;

      return new Response(
        JSON.stringify({
          status: 'success',
          provider: 'netlify',
          url: resultUrl,
          dashboardUrl: siteAdminUrl || 'https://app.netlify.com/sites',
          note: state === 'ready' ? 'Deploy is ready' : 'Deploy created, still processing',
        } as PublishResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (provider === 'vercel') {
      if (!VERCEL_TOKEN) {
        return new Response(
          JSON.stringify({ status: 'error', provider, error: 'Missing VERCEL_TOKEN in environment' } as PublishResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const name = sanitizeSiteName(body.siteName || 'my-site');
      const files = body.files;

      // Build files payload for Vercel v13 API (inline data base64)
      const filesPayload = Object.entries(files).map(([path, content]) => ({
        file: path.replace(/^\/+/, ''),
        data: btoa(unescape(encodeURIComponent(content))),
      }));

      const vercelRes = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          files: filesPayload,
          projectSettings: {
            framework: null,
          },
        }),
      });

      if (!vercelRes.ok) {
        const t = await vercelRes.text().catch(() => '');
        return new Response(
          JSON.stringify({ status: 'error', provider: 'vercel', error: `Vercel deploy failed: ${vercelRes.status} ${t}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const deployData = await vercelRes.json() as { url?: string };
      const url = deployData.url ? `https://${deployData.url}` : undefined;

      return new Response(
        JSON.stringify({
          status: 'success',
          provider: 'vercel',
          url,
          dashboardUrl: 'https://vercel.com/dashboard',
          note: 'Vercel deployment created',
        } as PublishResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ status: 'error', provider, error: 'Unsupported provider' } as PublishResponse),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[publish-site] error', err);
    return new Response(
      JSON.stringify({ status: 'error', provider: 'unknown', error: err instanceof Error ? err.message : 'Unknown error' } as PublishResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
