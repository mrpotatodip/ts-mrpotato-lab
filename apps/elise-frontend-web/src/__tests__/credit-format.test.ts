import { describe, expect, it } from "vitest";
import { creditScansLabel } from "#/modules/credit/utils/credit-format";

describe("creditScansLabel", () => {
  it.each([
    [12, null, "12"],
    [0, null, "0"],
    [12, 300, "12 of 300"],
    [300, 300, "300 of 300"],
  ])("shows %s scans against an allowance of %s as %s", (scans, allowance, expected) => {
    expect(creditScansLabel(scans, allowance)).toBe(expected);
  });
});
