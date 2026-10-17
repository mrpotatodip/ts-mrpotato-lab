import { describe, expect, it } from "vitest";
import { isAdminRoleKey, toAdminRoleKey } from "../admin-role-key";

describe("toAdminRoleKey", () => {
  it.each([
    ["Shift lead", "shift_lead"],
    ["  Shift   Lead!  ", "shift_lead"],
    ["Café manager", "cafe_manager"],
    ["2nd chef", "role_2nd_chef"],
    ["", ""],
    ["!!!", ""],
  ])("turns %j into %j", (label, key) => {
    expect(toAdminRoleKey(label)).toBe(key);
  });

  it("keeps the key within the length the server accepts", () => {
    const key = toAdminRoleKey("a".repeat(200));

    expect(key).toHaveLength(63);
    expect(isAdminRoleKey(key)).toBe(true);
  });

  it("suggests keys the server accepts", () => {
    expect(isAdminRoleKey(toAdminRoleKey("Shift lead"))).toBe(true);
    expect(isAdminRoleKey("Shift Lead")).toBe(false);
    expect(isAdminRoleKey("a")).toBe(false);
  });
});
