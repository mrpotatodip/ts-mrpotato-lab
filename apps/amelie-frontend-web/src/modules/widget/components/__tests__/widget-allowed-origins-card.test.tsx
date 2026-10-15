import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WidgetAllowedOriginsCard } from "../widget-allowed-origins-card";

afterEach(cleanup);

describe("WidgetAllowedOriginsCard", () => {
  it("lists the Tenant's Allowed origins", () => {
    render(
      <WidgetAllowedOriginsCard
        allowedOrigins={["https://sorellacafe.com"]}
        canEdit
        onSave={() => {}}
      />,
    );

    expect(screen.getByDisplayValue("https://sorellacafe.com")).toBeTruthy();
  });

  it("lets an editor add and remove rows then Save the list", () => {
    const onSave = vi.fn<(origins: string[]) => void>();
    render(
      <WidgetAllowedOriginsCard allowedOrigins={["https://a.example"]} canEdit onSave={onSave} />,
    );

    fireEvent.change(screen.getByDisplayValue("https://a.example"), {
      target: { value: "https://sorellacafe.com/menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add website" }));
    fireEvent.change(screen.getByDisplayValue(""), { target: { value: "https://b.example" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove website" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(["https://b.example"]);
  });

  it("warns that the cafe site cannot iframe the chat when the list is empty", () => {
    render(<WidgetAllowedOriginsCard allowedOrigins={[]} canEdit onSave={() => {}} />);

    expect(screen.getByText(/cannot iframe the chat/i)).toBeTruthy();
  });

  it("shows the list to staff without add, remove, or Save", () => {
    render(
      <WidgetAllowedOriginsCard
        allowedOrigins={["https://sorellacafe.com"]}
        canEdit={false}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText("https://sorellacafe.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add website" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove website" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });
});
