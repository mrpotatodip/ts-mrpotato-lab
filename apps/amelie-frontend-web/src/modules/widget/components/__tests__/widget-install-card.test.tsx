import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WidgetInstallCard } from "../widget-install-card";

afterEach(cleanup);

const renderCard = async (locations: { name: string; slug: string; country: string }[]) => {
  const root = createRootRoute({
    component: () => (
      <WidgetInstallCard slug="sorella" origin="http://localhost:3000" locations={locations} />
    ),
  });
  const chat = createRoute({ getParentRoute: () => root, path: "/chat/$slug" });
  const router = createRouter({
    routeTree: root.addChildren([chat]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByText("Country and location");
};

describe("WidgetInstallCard", () => {
  it("pins country and location on the snippet when the cafe has one Location", async () => {
    await renderCard([{ name: "Downtown", slug: "downtown", country: "US" }]);

    expect(
      screen.getByText(
        '<script src="http://localhost:3000/widget.js" data-slug="sorella" data-location="downtown" data-country="US" defer></script>',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Downtown\./)).toBeTruthy();
  });

  it("keeps the copied snippet slug-only when there are several Locations, and shows one tag per branch", async () => {
    await renderCard([
      { name: "Downtown", slug: "downtown", country: "US" },
      { name: "Airport", slug: "airport", country: "US" },
    ]);

    expect(screen.getByText('<script src="http://localhost:3000/widget.js" data-slug="sorella" defer></script>')).toBeTruthy();
    expect(
      screen.getByText(
        '<script src="http://localhost:3000/widget.js" data-slug="sorella" data-location="airport" data-country="US" defer></script>',
      ),
    ).toBeTruthy();
    expect(screen.getByText("Use the location for that website.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Try the chat on Amelie" })).toBeTruthy();
  });
});
