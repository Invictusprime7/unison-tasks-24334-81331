import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { RouteMetaProvider } from "@/routes";
import { RouteShellFrame } from "@/components/shell";
import { getRouteById } from "@/routes/routeConfig";

function renderFrame(routeId: string, initialPath: string, content = "Shell content") {
  const route = getRouteById(routeId);
  if (!route) throw new Error(`Missing route ${routeId}`);

  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path={route.path}
          element={
            <RouteMetaProvider meta={route.meta}>
              <RouteShellFrame>
                <div>{content}</div>
              </RouteShellFrame>
            </RouteMetaProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RouteShellFrame", () => {
  it("renders route-driven workspace shell chrome", () => {
    renderFrame("dashboard", "/dashboard");

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Shell navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Shell content")).toBeInTheDocument();
  });

  it("renders project breadcrumbs with resolved params", () => {
    renderFrame("project-setup", "/project/p1/setup");

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(screen.getByRole("heading", { name: "Project setup" })).toBeInTheDocument();
    expect(within(breadcrumb).getByRole("link", { name: "Project" })).toHaveAttribute("href", "/project/p1");
    expect(within(breadcrumb).getByText("Project setup")).toBeInTheDocument();
  });

  it("omits deprecated aliases from builder shell navigation", () => {
    renderFrame("web-builder", "/web-builder");

    expect(screen.getByRole("link", { name: "Web builder" })).toBeInTheDocument();
    expect(screen.queryByText("AI generator")).not.toBeInTheDocument();
  });
});
