import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listProjectsTool from "./tools/list-projects";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "unison-app-mcp",
  title: "Unison App MCP",
  version: "0.1.0",
  instructions:
    "Tools for this Unison workspace. Use `echo` to verify connectivity, and `list_projects` to read the signed-in user's projects.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listProjectsTool],
});
