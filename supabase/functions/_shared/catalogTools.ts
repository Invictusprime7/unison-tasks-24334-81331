/**
 * Edge-side mirror of `src/services/catalogOperations.ts::CATALOG_OPERATION_TOOLS`.
 *
 * Deno edge functions cannot import from `src/`. This mirrors the same
 * OpenAI-compatible chat-completions `tools` schema so the ai-code-assistant
 * provider loop can advertise the canonical catalog operations to the model.
 * When the model responds with `tool_calls`, the frontend AIBuilderPanel
 * dispatches them through `executeCatalogToolCalls()` — this file only
 * carries the schema advertisement.
 *
 * Keep in sync with:
 *   - src/services/catalogOperations.ts (CATALOG_OPERATION_TOOLS)
 *   - supabase/functions/_shared/catalogSurfaceSummary.ts (surfaceId enum)
 */

import { CATALOG_SURFACE_SUMMARY } from "./catalogSurfaceSummary.ts";

const SURFACE_IDS = CATALOG_SURFACE_SUMMARY.map((s) => s.surfaceId);

const LOCATOR_SCHEMA = {
  type: "object",
  description:
    "How to locate a site_data_bindings row. Prefer bindingId. Otherwise pass projectId + pagePath + sectionId (+ optional slotKey).",
  properties: {
    bindingId: { type: "string" },
    projectId: { type: "string" },
    pagePath: { type: "string" },
    sectionId: { type: "string" },
    slotKey: { type: ["string", "null"] },
  },
} as const;

const ROW_PATCH_SCHEMA = {
  type: "object",
  description:
    "Row patch. Use editable shape (name, description, price [dollars], image_url) OR pass raw column names declared in the surface editableFields.",
  additionalProperties: true,
  properties: {
    name: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    price: {
      type: ["number", "null"],
      description:
        "Price in DOLLARS. Auto-converted to price_cents when the surface stores cents.",
    },
    image_url: { type: ["string", "null"] },
  },
} as const;

/** Raw tool definitions (name, description, JSON-schema parameters). */
export const CATALOG_TOOL_DEFINITIONS = [
  {
    name: "createCatalogRow",
    description:
      "Create a new row in a canonical catalog surface (service/product/menu item/pricing plan/offer/testimonial/portfolio project). Use this instead of hand-editing TSX to add cards.",
    parameters: {
      type: "object",
      required: ["surfaceId", "businessId", "patch"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        businessId: { type: "string" },
        patch: ROW_PATCH_SCHEMA,
      },
    },
  },
  {
    name: "updateCatalogRow",
    description:
      "Patch fields on an existing catalog row (title, description, price, image). Prices are in DOLLARS.",
    parameters: {
      type: "object",
      required: ["surfaceId", "businessId", "rowId", "patch"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        businessId: { type: "string" },
        rowId: { type: "string" },
        patch: ROW_PATCH_SCHEMA,
      },
    },
  },
  {
    name: "deleteCatalogRow",
    description: "Delete an existing catalog row.",
    parameters: {
      type: "object",
      required: ["surfaceId", "businessId", "rowId"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        businessId: { type: "string" },
        rowId: { type: "string" },
      },
    },
  },
  {
    name: "updateSectionBinding",
    description:
      "Patch a site_data_bindings row (filters/sort/limit/collection/fallback/displayMapping). If no existing binding matches the locator, provide an `upsert` payload to create it.",
    parameters: {
      type: "object",
      required: ["surfaceId", "patch"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        upsert: {
          type: "object",
          properties: {
            businessId: { type: "string" },
            projectId: { type: "string" },
            pagePath: { type: "string" },
            sectionId: { type: "string" },
            slotKey: { type: ["string", "null"] },
            sourceKind: { type: "string" },
            sourceTable: { type: "string" },
          },
        },
        patch: {
          type: "object",
          properties: {
            collectionId: { type: ["string", "null"] },
            filters: { type: "object", additionalProperties: true },
            sort: {
              type: "object",
              properties: {
                field: { type: "string" },
                direction: { type: "string", enum: ["asc", "desc"] },
              },
            },
            limitCount: { type: ["number", "null"] },
            displayMapping: { type: "object", additionalProperties: { type: "string" } },
            fallbackMode: {
              type: "string",
              enum: ["empty_state", "hide_section", "show_placeholder"],
            },
          },
        },
      },
    },
  },
  {
    name: "switchSectionCollection",
    description: "Point a bound section at a different collection (or clear with null).",
    parameters: {
      type: "object",
      required: ["surfaceId", "locator", "collectionId"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        collectionId: { type: ["string", "null"] },
      },
    },
  },
  {
    name: "changeSectionLimit",
    description:
      "Set the max number of rows a bound section renders. Pass null to remove the limit.",
    parameters: {
      type: "object",
      required: ["surfaceId", "locator", "limitCount"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        limitCount: { type: ["number", "null"] },
      },
    },
  },
  {
    name: "changeSectionSort",
    description: "Change the sort field/direction of a bound section.",
    parameters: {
      type: "object",
      required: ["surfaceId", "locator", "sort"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        sort: {
          type: "object",
          properties: {
            field: { type: "string" },
            direction: { type: "string", enum: ["asc", "desc"] },
          },
        },
      },
    },
  },
  {
    name: "changeSectionFallback",
    description: "Change what a bound section renders when there are no rows.",
    parameters: {
      type: "object",
      required: ["surfaceId", "locator", "fallbackMode"],
      properties: {
        surfaceId: { type: "string", enum: SURFACE_IDS },
        locator: LOCATOR_SCHEMA,
        fallbackMode: {
          type: "string",
          enum: ["empty_state", "hide_section", "show_placeholder"],
        },
      },
    },
  },
] as const;

/** Wrap definitions in the OpenAI chat-completions `tools` shape. */
export const CATALOG_CHAT_TOOLS = CATALOG_TOOL_DEFINITIONS.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

/** Names of every catalog tool — for prompt lists and downstream validation. */
export const CATALOG_TOOL_NAMES = CATALOG_TOOL_DEFINITIONS.map((t) => t.name);

/** Prompt directive telling the model to prefer tool calls over TSX rewrites. */
export function renderCatalogToolDirective(): string {
  return [
    "",
    "CATALOG TOOL-CALLING CONTRACT (prefer over hand-editing TSX):",
    "- When the user asks to add/edit/remove catalog content (services, products, menu items,",
    "  pricing plans, offers, testimonials, portfolio items) or to change how a bound section",
    "  filters/sorts/limits its rows, RESPOND WITH tool_calls invoking the canonical operations:",
    `    ${CATALOG_TOOL_NAMES.join(", ")}`,
    "- Use surfaceId values from the CANONICAL CATALOG SURFACES block (services/products/menu/",
    "  pricing/offers/testimonials/portfolio). Never invent new surfaceIds.",
    "- Prices are ALWAYS in DOLLARS in tool arguments; the executor converts to cents when needed.",
    "- For binding edits, locate the row by { projectId, pagePath, sectionId } from the Catalog",
    "  Context block; only invent an `upsert` payload if no binding exists.",
    "- If a change is purely presentational (spacing/typography/copy that is NOT a catalog row),",
    "  fall back to a normal file patch — do NOT invent a catalog tool for it.",
    "- You may combine tool_calls with a short assistant message explaining what will change; the",
    "  frontend executes the tool_calls immediately and re-hydrates the preview.",
    "",
  ].join("\n");
}
