import { describe, expect, it } from "vitest";
import { UpdateTenantAllowedOriginsInputSchema, UpdateTenantCustomerChatInputSchema } from "../tenant-schemas";

const tenantId = "3f2a9c1e-7b64-4d0a-8e5f-1c2d3e4f5a6b";

describe("UpdateTenantAllowedOriginsInputSchema", () => {
  it("accepts tenantId and allowedOrigins at the top level", () => {
    expect(
      UpdateTenantAllowedOriginsInputSchema.parse({
        tenantId,
        allowedOrigins: ["https://sorellacafe.com/menu"],
      }),
    ).toEqual({
      tenantId,
      allowedOrigins: ["https://sorellacafe.com"],
    });
  });

  it("rejects a nested data wrapper so the server fn does not see undefined fields", () => {
    const result = UpdateTenantAllowedOriginsInputSchema.safeParse({
      data: { tenantId, allowedOrigins: ["https://sorellacafe.com"] },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))).toEqual([
      { path: ["allowedOrigins"], message: "Invalid input: expected array, received undefined" },
      { path: ["tenantId"], message: "Invalid input: expected string, received undefined" },
    ]);
  });
});

describe("UpdateTenantCustomerChatInputSchema", () => {
  it("accepts tenantId with trimmed label and hex colour", () => {
    expect(
      UpdateTenantCustomerChatInputSchema.parse({
        tenantId,
        customerChatLabel: " Ask Sorella ",
        customerChatAccent: "#B4532A",
      }),
    ).toEqual({
      tenantId,
      customerChatLabel: "Ask Sorella",
      customerChatAccent: "#b4532a",
    });
  });
});
