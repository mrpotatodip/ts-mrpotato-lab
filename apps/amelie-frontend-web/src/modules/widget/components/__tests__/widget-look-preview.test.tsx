import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WidgetLookPreview } from "../widget-look-preview";

afterEach(cleanup);

describe("WidgetLookPreview", () => {
  it("names the stage after the bubble label", () => {
    render(<WidgetLookPreview customerChatLabel="Ask Sorella" customerChatAccent="#b4532a" />);

    expect(screen.getByRole("img", { name: "Preview: Ask Sorella" })).toBeTruthy();
  });
});
