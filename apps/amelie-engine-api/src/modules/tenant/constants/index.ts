// -----
// Tenants
// -----
export const TENANT_NOT_FOUND = "Tenant not found";
export const TENANT_ID_REQUIRED = "tenantId query parameter must be a Tenant id";
export const TENANT_EDITOR_ONLY = "Only an owner or manager of this cafe can change it";
export const TENANT_COUNTRY_TAKEN = "This cafe already sells in that country";
export const TENANT_COUNTRY_CONSTRAINT = "uq_tenant_countries_tenant_country";
export const TENANT_REGION_MANY_COUNTRIES =
  "This cafe sells in more than one country, so its country and currency are edited in the Countries settings";
