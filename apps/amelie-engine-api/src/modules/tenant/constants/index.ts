import type { AccessPower } from "@repo/contracts/amelie";

// -----
// Tenants
// -----
export const TENANT_NOT_FOUND = "Tenant not found";
export const TENANT_ID_REQUIRED = "tenantId query parameter must be a Tenant id";
export const TENANT_ADMIN_ROLE = "tenant_admin";
export const TENANT_POWER_DENIED = "This Role cannot do that";
export const TENANT_COUNTRY_TAKEN = "This cafe already sells in that country";
export const TENANT_COUNTRY_CONSTRAINT = "uq_tenant_countries_tenant_country";
export const TENANT_REGION_MANY_COUNTRIES =
  "This cafe sells in more than one country, so its country and currency are edited in the Countries settings";

// -----
// Powers the tenant handlers check themselves, because
// these routes carry the Tenant in the path, and the
// route each one guards.
// -----
export const TENANT_SERVICE_POWER_ROUTES = {
  "company:profile:region:update": "PATCH /tenants/:tenantId/region",
  "integration:widget:origins:update": "PUT /tenants/:tenantId/allowed-origins",
  "integration:widget:look:update": "PUT /tenants/:tenantId/customer-chat",
} as const satisfies Partial<Record<AccessPower, string>>;
