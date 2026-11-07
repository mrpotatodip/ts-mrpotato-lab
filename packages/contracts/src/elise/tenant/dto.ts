import { z } from "zod";

// -----
// Requests: what the dashboard sends
// -----
export const TenantIdSchema = z.uuid();

export const TenantParamSchema = z.object({
  tenantId: TenantIdSchema,
});

// -----
// Responses: a Tenant as one of its
// party sees it, with their Role and
// that Role's Powers.
// -----
export const TenantSchema = z.object({
  id: TenantIdSchema,
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  role: z.string(),
  roleLabel: z.string(),
  powers: z.array(z.string()),
});

export type TenantParam = z.infer<typeof TenantParamSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
