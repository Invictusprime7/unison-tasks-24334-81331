import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { authError, verifyAuth } from "../_shared/auth.ts";

type JsonRpcRequest = {
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const tools = [
  {
    name: "echo",
    title: "Echo",
    description: "Echo input text to verify MCP connectivity.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", minLength: 1 } },
      required: ["text"],
    },
  },
  {
    name: "list_projects",
    title: "List projects",
    description: "List projects visible to the signed-in user.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100 } },
    },
  },
];

function jsonRpc(id: JsonRpcRequest["id"], result: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string, headers: Record<string, string>): Response {
  return jsonRpc(id, { error: { code, message } }, 200, headers);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error", corsHeaders);
  }

  if (body.method === "initialize") {
    return jsonRpc(body.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "unison-app-mcp", version: "0.1.0" },
    }, 200, corsHeaders);
  }
  if (body.method === "tools/list") return jsonRpc(body.id, { tools }, 200, corsHeaders);
  if (body.method !== "tools/call") return jsonRpcError(body.id, -32601, "Method not found", corsHeaders);

  const auth = await verifyAuth(req);
  if (!auth.user) return authError(auth.error || "Unauthorized", auth.status, corsHeaders);

  const name = typeof body.params?.name === "string" ? body.params.name : "";
  const args = body.params?.arguments && typeof body.params.arguments === "object"
    ? body.params.arguments as Record<string, unknown>
    : {};

  if (name === "echo") {
    const text = typeof args.text === "string" ? args.text.trim() : "";
    if (!text) return jsonRpcError(body.id, -32602, "text is required", corsHeaders);
    return jsonRpc(body.id, { content: [{ type: "text", text }] }, 200, corsHeaders);
  }

  if (name === "list_projects") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!supabaseUrl || !publishableKey || !token) {
      return jsonRpcError(body.id, -32603, "Supabase configuration is unavailable", corsHeaders);
    }

    const requestedLimit = typeof args.limit === "number" ? args.limit : 25;
    const limit = Math.max(1, Math.min(100, Math.trunc(requestedLimit)));
    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("projects")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return jsonRpcError(body.id, -32603, error.message, corsHeaders);
    return jsonRpc(body.id, {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { projects: data ?? [] },
    }, 200, corsHeaders);
  }

  return jsonRpcError(body.id, -32601, `Unknown tool: ${name}`, corsHeaders);
});
