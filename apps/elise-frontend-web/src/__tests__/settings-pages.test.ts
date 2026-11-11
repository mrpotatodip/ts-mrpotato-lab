import { describe, expect, it } from "vitest";
import { settingsPagesFor } from "#/modules/shell/utils/settings-pages";

const labels = (powers: string[]) => settingsPagesFor(powers).map((page) => page.label);

describe("settingsPagesFor", () => {
  it.each([
    ["an admin", ["company:usage:budget:update", "company:plan:read", "company:usage:anthropic_key:update"], ["Budget", "Plan", "Providers", "History"]],
    ["a reader who may change only the budget", ["company:usage:budget:update"], ["Budget", "History"]],
    ["a reader who may only read the plan", ["company:plan:read"], ["Plan"]],
    ["a reader with no settings Power", ["company:summary:read"], []],
  ])("lists for %s only the pages its route opens, in order", (_name, powers, expected) => {
    expect(labels(powers)).toEqual(expected);
  });
});
