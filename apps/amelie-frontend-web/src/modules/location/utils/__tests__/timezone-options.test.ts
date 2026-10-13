import { describe, expect, it } from "vitest";
import { timezoneOptions } from "../timezone-options";

describe("timezoneOptions", () => {
  it("lists the zones the browser knows", () => {
    expect(timezoneOptions("Europe/Rome")).toContain("Europe/Rome");
  });

  it("keeps a saved zone the browser list leaves out, first", () => {
    const options = timezoneOptions("Mars/Olympus");
    expect(options[0]).toBe("Mars/Olympus");
    expect(options).toContain("Europe/Rome");
  });

  it("does not repeat a zone it already has", () => {
    const options = timezoneOptions("Europe/Rome");
    expect(options.filter((zone) => zone === "Europe/Rome")).toHaveLength(1);
  });
});
