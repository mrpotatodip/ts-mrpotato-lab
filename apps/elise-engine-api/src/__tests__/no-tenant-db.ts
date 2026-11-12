import type { AppDeps } from "#/types/variables";

// -----
// For a route test that never reaches a tenant-scoped query: a
// call that does fails loudly instead of touching a database.
// -----
export const noTenantDb: AppDeps["withTenant"] = async () => {
  throw new Error("this test has no tenant database");
};
