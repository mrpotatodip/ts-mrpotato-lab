import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetCustomerChatCard } from "../widget-customer-chat-card";

afterEach(cleanup);

const renderCard = (
  overrides: Partial<{
    customerChatLabel: string;
    customerChatAccent: string | null;
    canEdit: boolean;
    onSave: (look: { customerChatLabel: string; customerChatAccent: string | null }) => void;
  }> = {},
) => {
  const onSave =
    overrides.onSave ?? vi.fn<(look: { customerChatLabel: string; customerChatAccent: string | null }) => void>();
  render(
    <WidgetCustomerChatCard
      customerChatLabel={overrides.customerChatLabel ?? "Chat with us"}
      customerChatAccent={overrides.customerChatAccent ?? null}
      canEdit={overrides.canEdit ?? true}
      isPending={false}
      error={null}
      onSave={onSave}
    />,
  );
  return onSave;
};

describe("WidgetCustomerChatCard", () => {
  it("lets an editor save button text and a colour", () => {
    const onSave = renderCard();

    fireEvent.change(screen.getByLabelText("Button label"), { target: { value: "Ask Sorella" } });
    fireEvent.change(screen.getByLabelText("Colour"), { target: { value: "#b4532a" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" });
  });

  it("shows the stored look to staff without Save", () => {
    renderCard({ canEdit: false, customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" });

    expect(screen.getByText("Ask Sorella")).toBeTruthy();
    expect(screen.getByText("#b4532a")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });
});
