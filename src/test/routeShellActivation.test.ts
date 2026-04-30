import { describe, expect, it } from "vitest";

import { getRouteById } from "@/routes/routeConfig";
import { isRouteShellEnabled, parseRouteShellsEnv } from "@/routes/routeShellActivation";

function meta(routeId: string) {
  const route = getRouteById(routeId);
  if (!route) throw new Error(`Missing route ${routeId}`);
  return route.meta;
}

describe("route shell activation", () => {
  it("defaults to disabled", () => {
    expect(isRouteShellEnabled(meta("dashboard"))).toBe(false);
  });

  it("enables workspace/project/builder shells when explicitly enabled", () => {
    expect(isRouteShellEnabled({ ...meta("dashboard"), chrome: "canonical" }, { enabled: true })).toBe(true);
    expect(isRouteShellEnabled({ ...meta("project-setup"), chrome: "canonical" }, { enabled: true })).toBe(true);
    expect(isRouteShellEnabled({ ...meta("web-builder"), chrome: "canonical" }, { enabled: true })).toBe(true);
  });

  it("does not activate routes still marked as legacy or fullscreen chrome", () => {
    expect(isRouteShellEnabled(meta("dashboard"), { enabled: true })).toBe(false);
    expect(isRouteShellEnabled(meta("web-builder"), { enabled: true })).toBe(false);
  });

  it("keeps public and auth-like routes excluded even when globally enabled", () => {
    expect(isRouteShellEnabled(meta("landing"), { enabled: true })).toBe(false);
    expect(isRouteShellEnabled(meta("auth"), { enabled: true })).toBe(false);
    expect(isRouteShellEnabled(meta("auth-callback"), { enabled: true })).toBe(false);
    expect(isRouteShellEnabled(meta("not-found"), { enabled: true })).toBe(false);
  });

  it("supports shell allow-list activation", () => {
    expect(isRouteShellEnabled({ ...meta("dashboard"), chrome: "canonical" }, { enabled: true, enabledShells: ["builder"] })).toBe(false);
    expect(isRouteShellEnabled({ ...meta("web-builder"), chrome: "canonical" }, { enabled: true, enabledShells: ["builder"] })).toBe(true);
  });

  it("supports route-level exclusions", () => {
    expect(isRouteShellEnabled({ ...meta("web-builder"), chrome: "canonical" }, { enabled: true, disabledRouteIds: ["web-builder"] })).toBe(false);
  });

  it("parses route shell env lists", () => {
    expect(parseRouteShellsEnv(undefined)).toBeUndefined();
    expect(parseRouteShellsEnv("")).toBeUndefined();
    expect(parseRouteShellsEnv("workspace,builder")).toEqual(["workspace", "builder"]);
    expect(parseRouteShellsEnv(" workspace, project ")).toEqual(["workspace", "project"]);
  });
});
