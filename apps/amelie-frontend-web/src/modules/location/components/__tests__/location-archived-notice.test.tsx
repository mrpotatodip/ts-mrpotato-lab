import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { LocationArchivedNotice as ArchivedNotice } from "../../schemas";
import { LocationArchivedNotice } from "../location-archived-notice";

afterEach(cleanup);

const latte = { id: "22222222-2222-4222-8222-222222222222", name: "Latte" };
const bagel = { id: "33333333-3333-4333-8333-333333333333", name: "Bagel" };

const renderNotice = async (notice: ArchivedNotice, onDismiss: () => void) => {
  const root = createRootRoute({ component: () => <LocationArchivedNotice notice={notice} onDismiss={onDismiss} /> });
  const menu = createRoute({ getParentRoute: () => root, path: "/menu" });
  const router = createRouter({
    routeTree: root.addChildren([menu]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("status");
};

describe("LocationArchivedNotice", () => {
  it("lists the items now sold nowhere, with a link to the Menu", async () => {
    await renderNotice({ name: "Airport", unsoldMenuItems: [latte, bagel] }, () => {});

    expect(screen.getByText("Archived Airport.")).toBeTruthy();
    expect(screen.getByText("Latte")).toBeTruthy();
    expect(screen.getByText("Bagel")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Menu/ }).getAttribute("href")).toBe("/menu");
  });

  it("only says what was archived when no item is left unsold", async () => {
    await renderNotice({ name: "Airport", unsoldMenuItems: [] }, () => {});

    expect(screen.getByText("Archived Airport.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("calls onDismiss from the Dismiss button", async () => {
    let dismissed = 0;
    await renderNotice({ name: "Airport", unsoldMenuItems: [latte] }, () => (dismissed += 1));

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(dismissed).toBe(1);
  });
});
