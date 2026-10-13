import { describe, expect, it } from "vitest";
import { SIGN_UP_INVITE_CODE_MAX } from "@repo/contracts/amelie";
import { SignUpSearchSchema } from "../sign-up-search-schemas";

describe("SignUpSearchSchema", () => {
  it("reads the code", () => {
    expect(SignUpSearchSchema.parse({ code: "K7M2-9QXA-4TWB" })).toEqual({ code: "K7M2-9QXA-4TWB" });
  });

  it("trims the code", () => {
    expect(SignUpSearchSchema.parse({ code: "  K7M2-9QXA  " }).code).toBe("K7M2-9QXA");
  });

  it("reads a code the router turned into a number", () => {
    expect(SignUpSearchSchema.parse({ code: 234567892345 }).code).toBe("234567892345");
  });

  it("leaves the code empty when it is missing", () => {
    expect(SignUpSearchSchema.parse({}).code).toBeUndefined();
  });

  it("ignores a code of the wrong kind", () => {
    expect(SignUpSearchSchema.parse({ code: { a: 1 } }).code).toBeUndefined();
    expect(SignUpSearchSchema.parse({ code: ["a"] }).code).toBeUndefined();
  });

  it("cuts a code longer than the contract allows", () => {
    const parsed = SignUpSearchSchema.parse({ code: "A".repeat(SIGN_UP_INVITE_CODE_MAX + 20) });

    expect(parsed.code).toHaveLength(SIGN_UP_INVITE_CODE_MAX);
  });
});
