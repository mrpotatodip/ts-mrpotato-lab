import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminRoleDetail } from "@repo/contracts/amelie";

import { AdminRoleBindingCard } from "../admin-role-binding-card";

const save = vi.fn<(canBeBound: boolean) => void>();

afterEach(() => {
  cleanup();
  save.mockClear();
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
  powers: [],
  ...overrides,
});

const saving = (overrides: Partial<{ isPending: boolean; errorMessage: string | null }> = {}) => ({
  isPending: false,
  errorMessage: null,
  save,
  ...overrides,
});

const box = () => screen.getByRole("checkbox", { name: "Members can be limited to a Country or Location" });

describe("AdminRoleBindingCard", () => {
  it("shows the saved setting and saves the opposite on a click", () => {
    render(<AdminRoleBindingCard role={role({ canBeBound: true })} saving={saving()} />);

    expect(box().getAttribute("aria-checked")).toBe("true");
    fireEvent.click(box());
    expect(save).toHaveBeenCalledWith(false);
  });

  it("turns it on from off", () => {
    render(<AdminRoleBindingCard role={role()} saving={saving()} />);

    fireEvent.click(box());
    expect(save).toHaveBeenCalledWith(true);
  });

  it("is fixed off, with the reason, for a system role", () => {
    render(<AdminRoleBindingCard role={role({ isSystem: true })} saving={saving()} />);

    expect(box().getAttribute("aria-checked")).toBe("false");
    expect(box().hasAttribute("data-disabled") || box().hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("A system role is always cafe-wide.")).toBeDefined();
  });

  it("shows the server's refusal", () => {
    const message = "Cannot turn this off: 3 members still have bindings. Clear them first.";
    render(<AdminRoleBindingCard role={role({ canBeBound: true })} saving={saving({ errorMessage: message })} />);

    expect(screen.getByText(message)).toBeDefined();
  });
});
