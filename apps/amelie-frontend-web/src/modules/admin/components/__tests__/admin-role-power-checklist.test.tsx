import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_ROLE_GRANTS, type AdminRoleDetail } from "@repo/contracts/amelie";

import type { AdminRolePowerSave } from "../../types";
import { AdminRolePowerChecklist } from "../admin-role-power-checklist";

const save = vi.fn<AdminRolePowerSave["save"]>();

afterEach(() => {
  cleanup();
  save.mockClear();
});

const saving = (overrides: Partial<AdminRolePowerSave> = {}): AdminRolePowerSave => ({
  isPending: false,
  errorMessage: null,
  save,
  ...overrides,
});

const role = (overrides: Partial<AdminRoleDetail> = {}): AdminRoleDetail => ({
  id: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
  key: "shift_lead",
  label: "Shift lead",
  description: null,
  scope: "tenant",
  enabled: true,
  isSystem: false,
  canBeBound: false,
  powerCount: 1,
  holderCount: 2,
  powers: ["company:menu:items:read"],
  ...overrides,
});

const box = (name: string) => screen.getByLabelText(name);

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute("disabled") ||
  element.hasAttribute("data-disabled") ||
  element.getAttribute("aria-disabled") === "true";

describe("AdminRolePowerChecklist", () => {
  it("ticks the saved powers and nothing else", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);

    expect(box("Master menu › Menu item: read").getAttribute("aria-checked")).toBe("true");
    expect(box("Master menu › Menu item: update").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/1 of \d+ powers/)).toBeDefined();
  });

  it("only offers Powers of the role's scope", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);

    expect(screen.queryByText("Admin")).toBeNull();
    expect(screen.queryByText("Invite code")).toBeNull();
  });

  it("keeps Save off until a box changes, then counts the edit", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);
    const saveButton = screen.getByRole("button", { name: "Save powers" });
    expect(isDisabled(saveButton)).toBe(true);

    fireEvent.click(box("Master menu › Menu item: update"));

    expect(isDisabled(saveButton)).toBe(false);
    expect(screen.getByText("1 unsaved")).toBeDefined();
  });

  it("forgets an edit that goes back to the saved state", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);

    fireEvent.click(box("Master menu › Menu item: update"));
    fireEvent.click(box("Master menu › Menu item: update"));

    expect(isDisabled(screen.getByRole("button", { name: "Save powers" }))).toBe(true);
    expect(screen.queryByText(/unsaved/)).toBeNull();
  });

  it("asks before saving, naming how many people it reaches, then sends the full list", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);

    fireEvent.click(box("Master menu › Menu item: update"));
    fireEvent.click(screen.getByRole("button", { name: "Save powers" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/2 people across every cafe get this at once/)).toBeDefined();
    expect(within(dialog).getByText("+ company:menu:items:update")).toBeDefined();
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save powers" }));

    expect(save).toHaveBeenCalledWith(["company:menu:items:read", "company:menu:items:update"], expect.any(Function));
  });

  it("shows the server's refusal and locks the form while saving", () => {
    render(
      <AdminRolePowerChecklist
        role={role()}
        saving={saving({ isPending: true, errorMessage: "A system role cannot lose powers" })}
      />,
    );

    expect(screen.getByText("A system role cannot lose powers")).toBeDefined();
    expect(isDisabled(box("Master menu › Menu item: update"))).toBe(true);
  });

  it("clears its edits once the save lands", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);
    fireEvent.click(box("Master menu › Menu item: update"));
    fireEvent.click(screen.getByRole("button", { name: "Save powers" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save powers" }));

    const onSaved = save.mock.calls[0]?.[1];
    if (!onSaved) throw new Error("save was not called");
    act(() => onSaved());

    expect(screen.queryByText(/unsaved/)).toBeNull();
  });

  it("discards edits", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);
    fireEvent.click(box("Master menu › Menu item: update"));

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(box("Master menu › Menu item: update").getAttribute("aria-checked")).toBe("false");
  });

  it("locks a system role's saved powers so they can only grow", () => {
    render(<AdminRolePowerChecklist role={role({ isSystem: true })} saving={saving()} />);

    expect(isDisabled(box("Master menu › Menu item: read"))).toBe(true);
    expect(isDisabled(box("Master menu › Menu item: update"))).toBe(false);
    expect(screen.getByText(/can be added, never taken away/)).toBeDefined();
  });

  it("ticks a whole group with one box, and unticks it again, leaving locked powers alone", () => {
    render(<AdminRolePowerChecklist role={role({ isSystem: true })} saving={saving()} />);
    const all = box("Select all Company");

    fireEvent.click(all);
    expect(box("Master menu › Menu item: update").getAttribute("aria-checked")).toBe("true");
    expect(all.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(all);
    expect(box("Master menu › Menu item: update").getAttribute("aria-checked")).toBe("false");
    expect(box("Master menu › Menu item: read").getAttribute("aria-checked")).toBe("true");
  });

  it("shows a group box as mixed when only some of its powers are ticked", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);

    expect(box("Select all Company").getAttribute("aria-checked")).toBe("mixed");
    expect(box("Select all Integration").getAttribute("aria-checked")).toBe("false");
  });

  it("ticks the rest of a mixed group on the next click", () => {
    render(<AdminRolePowerChecklist role={role()} saving={saving()} />);

    fireEvent.click(box("Select all Company"));

    expect(box("Select all Company").getAttribute("aria-checked")).toBe("true");
    expect(box("Master menu › Menu item: update").getAttribute("aria-checked")).toBe("true");
  });

  it("disables a group box when every power in the group is locked", () => {
    const all = ACCESS_ROLE_GRANTS.tenant_admin;
    render(<AdminRolePowerChecklist role={role({ isSystem: true, powers: [...all] })} saving={saving()} />);

    expect(isDisabled(box("Select all Company"))).toBe(true);
  });
});
