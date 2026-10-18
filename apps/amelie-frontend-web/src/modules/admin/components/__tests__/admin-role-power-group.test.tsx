import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminPowerEdits, AdminPowerGroup } from "../../types";
import { toAdminPowerGroups } from "../../utils";
import { AdminRolePowerGroup } from "../admin-role-power-group";

afterEach(cleanup);

const storeGroup = (): AdminPowerGroup => {
  const group = toAdminPowerGroups("tenant").find((candidate) => candidate.key === "store");
  if (!group) throw new Error("the Store group is missing");
  return group;
};

const renderGroup = (overrides: { saved?: string[]; edits?: AdminPowerEdits; locked?: Set<string> } = {}) => {
  const onChange = vi.fn<(edits: AdminPowerEdits) => void>();
  render(
    <AdminRolePowerGroup
      group={storeGroup()}
      saved={overrides.saved ?? ["store:hours:weekly:read"]}
      edits={overrides.edits ?? {}}
      locked={overrides.locked ?? new Set()}
      disabled={false}
      onChange={onChange}
    />,
  );
  return onChange;
};

describe("AdminRolePowerGroup", () => {
  it("has one column per Action the group uses, and no more", () => {
    renderGroup();

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent?.trim());
    expect(headers).toEqual(["Area", "Read", "Create", "Update", "Delete"]);
  });

  it("sets each section's rows under the area they share, with a short name", () => {
    renderGroup();

    expect(screen.getByRole("cell", { name: "Hours" })).toBeDefined();
    expect(screen.getByRole("cell", { name: "Store menu" })).toBeDefined();
    expect(screen.getByRole("cell", { name: /^Business hours/ })).toBeDefined();
    expect(screen.getByRole("cell", { name: /^Location availability/ })).toBeDefined();
  });

  it("puts a box only where a section has that Action", () => {
    renderGroup();
    const row = screen.getByRole("cell", { name: /^Business hours/ }).closest("tr");
    if (!row) throw new Error("the Business hours row is missing");

    expect(within(row).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(row).getByLabelText("Hours › Business hours: update")).toBeDefined();
    expect(within(row).queryByLabelText("Hours › Business hours: create")).toBeNull();
  });

  it("ticks the saved Powers and reports an edit when a box is clicked", () => {
    const onChange = renderGroup();

    expect(screen.getByLabelText("Hours › Business hours: read").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("Hours › Business hours: update").getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByLabelText("Hours › Business hours: update"));

    expect(onChange).toHaveBeenCalledWith({ "store:hours:weekly:update": true });
  });

  it("locks a Power that cannot be taken away", () => {
    renderGroup({ locked: new Set(["store:hours:weekly:read"]) });

    const box = screen.getByLabelText("Hours › Business hours: read");
    expect(box.hasAttribute("data-disabled") || box.getAttribute("aria-disabled") === "true").toBe(true);
  });
});
