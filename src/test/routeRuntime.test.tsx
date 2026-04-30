import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  RouteRuntimeProvider,
  deriveRouteRuntime,
  deriveRouteRuntimeIdentity,
  getRouteById,
  useRequiredRouteRuntime,
} from "@/routes";

function RuntimeProbe() {
  const runtime = useRequiredRouteRuntime();

  return (
    <dl>
      <dt>Route</dt>
      <dd>{runtime.routeId}</dd>
      <dt>Project</dt>
      <dd>{runtime.identity.projectId ?? "none"}</dd>
      <dt>Business</dt>
      <dd>{runtime.identity.businessId ?? "none"}</dd>
      <dt>Project source</dt>
      <dd>{runtime.identity.sources.projectId ?? "none"}</dd>
      <dt>Business source</dt>
      <dd>{runtime.identity.sources.businessId ?? "none"}</dd>
    </dl>
  );
}

describe("route runtime", () => {
  it("normalizes project identity from legacy id params", () => {
    expect(deriveRouteRuntimeIdentity({ id: "project_1" })).toEqual({
      projectId: "project_1",
      workspaceId: null,
      businessId: null,
      sources: {
        projectId: "params.id",
      },
    });
  });

  it("prefers project route params over navigation state fallbacks", () => {
    expect(
      deriveRouteRuntimeIdentity(
        { projectId: "project_from_params" },
        { projectId: "project_from_state", returnProjectId: "project_from_return" },
      ),
    ).toEqual({
      projectId: "project_from_params",
      workspaceId: null,
      businessId: null,
      sources: {
        projectId: "params.projectId",
      },
    });
  });

  it("derives project, workspace, and business identity from navigation state", () => {
    expect(
      deriveRouteRuntimeIdentity({}, {
        returnProjectId: "project_from_return",
        workspaceId: "workspace_1",
        returnBusinessId: "business_1",
      }),
    ).toEqual({
      projectId: "project_from_return",
      workspaceId: "workspace_1",
      businessId: "business_1",
      sources: {
        projectId: "location.state.returnProjectId",
        workspaceId: "location.state.workspaceId",
        businessId: "location.state.returnBusinessId",
      },
    });
  });

  it("derives route runtime from route metadata", () => {
    const route = getRouteById("project-setup");
    if (!route) throw new Error("Missing project setup route");

    expect(deriveRouteRuntime(route.meta, "/project/project_1/setup", { projectId: "project_1" })).toMatchObject({
      routeId: "project-setup",
      pathname: "/project/project_1/setup",
      shell: "project",
      section: "projects",
      chrome: "legacy",
      requiresAuth: true,
      requiresWorkspace: true,
      requiresProject: true,
      identity: {
        projectId: "project_1",
        sources: {
          projectId: "params.projectId",
        },
      },
    });
  });

  it("provides canonical runtime context inside routed elements", () => {
    const route = getRouteById("project-setup");
    if (!route) throw new Error("Missing project setup route");

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/project/project_1/setup",
            state: {
              businessId: "business_1",
            },
          },
        ]}
      >
        <Routes>
          <Route
            path={route.path}
            element={
              <RouteRuntimeProvider meta={route.meta}>
                <RuntimeProbe />
              </RouteRuntimeProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("project-setup")).toBeInTheDocument();
    expect(screen.getByText("project_1")).toBeInTheDocument();
    expect(screen.getByText("business_1")).toBeInTheDocument();
    expect(screen.getByText("params.projectId")).toBeInTheDocument();
    expect(screen.getByText("location.state.businessId")).toBeInTheDocument();
  });
});
