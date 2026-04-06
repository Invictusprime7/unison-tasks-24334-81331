/**
 * Site Bundle Validation Tests
 * 
 * Tests structural integrity of SiteBundle types and schemas.
 */
import { describe, it, expect } from "vitest";
import {
  SiteBundleSchema,
  RuntimeConfigSchema,
  PreviewEngineSchema,
  IntentDefinitionSchema,
} from "@/schemas/SiteBundle";

describe("PreviewEngineSchema", () => {
  it("accepts valid engine types", () => {
    expect(PreviewEngineSchema.safeParse("simple").success).toBe(true);
    expect(PreviewEngineSchema.safeParse("vfs").success).toBe(true);
    expect(PreviewEngineSchema.safeParse("worker").success).toBe(true);
  });

  it("rejects invalid engine types", () => {
    expect(PreviewEngineSchema.safeParse("sandpack").success).toBe(false);
    expect(PreviewEngineSchema.safeParse("docker").success).toBe(false);
    expect(PreviewEngineSchema.safeParse("").success).toBe(false);
  });
});

describe("RuntimeConfigSchema", () => {
  it("validates a correct runtime config", () => {
    const result = RuntimeConfigSchema.safeParse({
      preferredEngine: "vfs",
      enginesAllowed: ["simple", "vfs"],
      entry: { type: "react", pageId: "home" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = RuntimeConfigSchema.safeParse({
      preferredEngine: "vfs",
    });
    expect(result.success).toBe(false);
  });
});

describe("IntentDefinitionSchema", () => {
  it("validates a correct intent definition", () => {
    const result = IntentDefinitionSchema.safeParse({
      id: "contact.submit",
      type: "action",
      label: "Submit Contact Form",
      handler: "edge-function",
    });
    expect(result.success).toBe(true);
  });
});

describe("SiteBundle type structure", () => {
  it("SiteBundleSchema exists and is a zod object", () => {
    expect(SiteBundleSchema).toBeDefined();
    expect(typeof SiteBundleSchema.safeParse).toBe("function");
  });
});
