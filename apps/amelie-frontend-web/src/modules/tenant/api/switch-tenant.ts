import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { setActiveTenantId } from "#/lib/active-tenant";
import { SwitchTenantInputSchema, TenantsResponseSchema } from "../schemas";

// -----
// Only a cafe the Person belongs to can become
// the active one; the cookie is just a hint.
// -----
export const switchTenant = createServerFn({ method: "POST" })
  .validator(SwitchTenantInputSchema)
  .handler(async ({ data: { tenantId } }) => {
    const { data, error } = await tryCatch(apiClient.get("/tenants", TenantsResponseSchema));

    if (error) {
      throw new Error(error instanceof ApiError ? error.message : "Failed to switch cafe");
    }

    if (!data.data?.some((tenant) => tenant.id === tenantId)) {
      throw new Error("You are not a member of that cafe");
    }

    setActiveTenantId(tenantId);
    return { tenantId };
  });
