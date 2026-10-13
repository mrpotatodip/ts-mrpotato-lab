import { describe, expect, it } from "vitest";
import { SetWeeklyHoursBodySchema, UpdateBusinessProfileBodySchema } from "@repo/contracts/amelie";

describe("dashboard request schemas", () => {
  it("accepts a whole profile with empty fields as null, and refuses a bad email or website", () => {
    const empty = { description: null, websiteUrl: null, phone: null, email: null, address: null };

    expect(UpdateBusinessProfileBodySchema.safeParse(empty).success).toBe(true);
    expect(UpdateBusinessProfileBodySchema.safeParse({ ...empty, email: "not-an-email" }).success).toBe(false);
    expect(UpdateBusinessProfileBodySchema.safeParse({ ...empty, websiteUrl: "sorella" }).success).toBe(false);
  });

  it("holds weekly hours to the same rules as the chat tools", () => {
    expect(SetWeeklyHoursBodySchema.safeParse({ isClosed: false, opensAt: "08:00", closesAt: "16:00" }).success).toBe(true);
    expect(SetWeeklyHoursBodySchema.safeParse({ isClosed: true, opensAt: null, closesAt: null }).success).toBe(true);
    expect(SetWeeklyHoursBodySchema.safeParse({ isClosed: false, opensAt: "16:00", closesAt: "08:00" }).success).toBe(false);
    expect(SetWeeklyHoursBodySchema.safeParse({ isClosed: true, opensAt: "08:00", closesAt: null }).success).toBe(false);
    expect(SetWeeklyHoursBodySchema.safeParse({ isClosed: false, opensAt: "8am", closesAt: "4pm" }).success).toBe(false);
  });
});
