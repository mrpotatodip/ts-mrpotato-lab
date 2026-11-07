import { describe, expect, it } from "vitest";
import { SIGN_UP_SLUG_MAX_LENGTH } from "#/modules/sign-up/constants";
import { slugCandidates, slugify } from "#/modules/sign-up/lib";

describe("slugify", () => {
  it("lowercases, drops accents and joins words with hyphens", () => {
    expect(slugify("Café Crème & Co.")).toBe("cafe-creme-co");
  });

  it("falls back to a fixed word when nothing is left", () => {
    expect(slugify("!!!")).toBe("account");
  });

  it("stays within the length limit", () => {
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(SIGN_UP_SLUG_MAX_LENGTH);
  });
});

describe("slugCandidates", () => {
  it("tries the name first, then name-2, name-3", () => {
    expect(slugCandidates("Acme Labs", 3)).toEqual(["acme-labs", "acme-labs-2", "acme-labs-3"]);
  });

  it("skips a reserved word", () => {
    expect(slugCandidates("Admin", 2)).toEqual(["admin-2", "admin-3"]);
  });

  it("keeps a suffixed slug within the length limit", () => {
    const candidates = slugCandidates("a".repeat(100), 12);
    expect(candidates.every((slug) => slug.length <= SIGN_UP_SLUG_MAX_LENGTH)).toBe(true);
  });
});
