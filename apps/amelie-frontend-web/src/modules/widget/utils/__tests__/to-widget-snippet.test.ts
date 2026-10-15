import { describe, expect, it } from "vitest";
import { toWidgetSnippet } from "../to-widget-snippet";

describe("toWidgetSnippet", () => {
  it("includes the Tenant slug and the Amelie script", () => {
    expect(toWidgetSnippet("http://localhost:3000", "sorella")).toBe(
      '<script src="http://localhost:3000/widget.js" data-slug="sorella" defer></script>',
    );
  });

  it("adds data-location and data-country when they are set", () => {
    expect(toWidgetSnippet("http://localhost:3000", "sorella", { location: "airport", country: "US" })).toBe(
      '<script src="http://localhost:3000/widget.js" data-slug="sorella" data-location="airport" data-country="US" defer></script>',
    );
  });
});
