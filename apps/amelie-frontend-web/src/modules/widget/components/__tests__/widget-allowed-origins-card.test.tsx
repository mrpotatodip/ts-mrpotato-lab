import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetAllowedOriginsCard } from "../widget-allowed-origins-card";

afterEach(cleanup);

const renderCard = (
  overrides: Partial<{
    allowedOrigins: string[];
    canEdit: boolean;
    onSave: (allowedOrigins: string[]) => void;
  }> = {},
) => {
  const onSave = overrides.onSave ?? vi.fn<(allowedOrigins: string[]) => void>();
  render(
    <WidgetAllowedOriginsCard
      allowedOrigins={overrides.allowedOrigins ?? ["https://sorellacafe.com"]}
      canEdit={overrides.canEdit ?? true}
      isPending={false}
      error={null}
      onSave={onSave}
    />,
  );
  return onSave;
};

describe("WidgetAllowedOriginsCard", () => {
  it("lets an editor add and remove rows, then save the typed list", () => {
    const onSave = renderCard({ allowedOrigins: [] });

    fireEvent.click(screen.getByRole("button", { name: "Add website" }));
    fireEvent.change(screen.getByLabelText("Allowed origin 1"), {
      target: { value: "https://sorellacafe.com/menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add website" }));
    fireEvent.change(screen.getByLabelText("Allowed origin 2"), { target: { value: "http://localhost:5174" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove allowed origin 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(["https://sorellacafe.com/menu"]);
  });

  it("warns when the list is empty", () => {
    renderCard({ allowedOrigins: [] });

    expect(screen.getByText("The cafe site cannot iframe the chat. Chat on Amelie still works.")).toBeTruthy();
  });

  it("shows the list to staff without add, remove, or Save", () => {
    renderCard({ canEdit: false, allowedOrigins: ["https://sorellacafe.com"] });

    expect(screen.getByText("https://sorellacafe.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add website" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove allowed origin 1" })).toBeNull();
  });

  it("does not save a rejected row", () => {
    const onSave = renderCard({ allowedOrigins: [] });

    fireEvent.click(screen.getByRole("button", { name: "Add website" }));
    fireEvent.change(screen.getByLabelText("Allowed origin 1"), { target: { value: "*" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Each website must be an http or https URL. At most 20 unique sites.")).toBeTruthy();
  });
});
