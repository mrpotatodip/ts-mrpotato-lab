import { describe, expect, it } from "vitest";

import { toWidgetBubbleLook } from "../to-widget-bubble-look";

describe("toWidgetBubbleLook", () => {
  it("uses the widget default bubble when there is no accent", () => {
    expect(toWidgetBubbleLook("Ask Sorella", null)).toEqual({
      label: "Ask Sorella",
      background: "#171717",
      color: "#fff",
    });
  });

  it("paints a dark accent with white type", () => {
    expect(toWidgetBubbleLook("Ask Sorella", "#b4532a")).toEqual({
      label: "Ask Sorella",
      background: "#b4532a",
      color: "#fff",
    });
  });

  it("paints a light accent with dark type", () => {
    expect(toWidgetBubbleLook("Ask Sorella", "#f4e8d8")).toEqual({
      label: "Ask Sorella",
      background: "#f4e8d8",
      color: "#171717",
    });
  });

  it("falls back to Chat with us when the label is blank", () => {
    expect(toWidgetBubbleLook("  ", null).label).toBe("Chat with us");
  });
});
