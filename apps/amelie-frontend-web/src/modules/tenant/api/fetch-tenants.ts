import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { getRememberedTenantId } from "#/lib/active-tenant";
import { TenantsResponseSchema } from "../schemas";

// -----
// The cafes this Person belongs to, and which
// one the dashboard is working in.
// -----
export const fetchTenants = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await tryCatch(apiClient.get("/tenants", TenantsResponseSchema));

  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load your cafes");
  }

  if (!data.data) {
    throw new Error("Failed to load your cafes");
  }

  const remembered = getRememberedTenantId();
  const active = data.data.find((tenant) => tenant.id === remembered) ?? data.data[0];
  return { tenants: data.data, activeTenantId: active?.id ?? null };
});
