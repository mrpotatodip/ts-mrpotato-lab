import { z } from "zod";
import { ALLOWED_ORIGINS_MAX } from "../constants";
import { COUNTRY_VALUES, CURRENCY_VALUES, TENANT_ROLE_KEY_VALUES } from "../enums";

// -----
// Requests: what the dashboard sends
// -----
export const TenantIdSchema = z.uuid();

export const TenantParamSchema = z.object({
  tenantId: TenantIdSchema,
});

export const TenantRegionSchema = z.object({
  country: z.enum(COUNTRY_VALUES),
  currency: z.enum(CURRENCY_VALUES),
});

export const UpdateTenantRegionBodySchema = TenantRegionSchema;

export const ALLOWED_ORIGINS_INVALID =
  "Each website must be an http or https URL. At most 20 unique sites.";

export function parseAllowedOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname === "*" || url.hostname === "") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function normalizeAllowedOrigins(rows: readonly string[]): string[] | null {
  const unique: string[] = [];
  for (const row of rows) {
    const origin = parseAllowedOrigin(row);
    if (!origin) return null;
    if (!unique.includes(origin)) unique.push(origin);
  }
  if (unique.length > ALLOWED_ORIGINS_MAX) return null;
  return unique;
}

export const UpdateTenantAllowedOriginsBodySchema = z.object({
  allowedOrigins: z
    .array(z.string())
    .superRefine((rows, ctx) => {
      if (normalizeAllowedOrigins(rows) === null) {
        ctx.addIssue({ code: "custom", message: ALLOWED_ORIGINS_INVALID });
      }
    })
    .transform((rows) => {
      const origins = normalizeAllowedOrigins(rows);
      return origins ?? [];
    }),
});

// -----
// Responses: a Tenant as one of its
// party sees it, with their role and
// whether that role can edit. country and
// currency are those of the Tenant's first open
// Country; the Tenant row holds neither.
// -----
export const TenantSchema = z.object({
  id: TenantIdSchema,
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  country: z.enum(COUNTRY_VALUES),
  currency: z.enum(CURRENCY_VALUES),
  allowedOrigins: z.array(z.string()),
  role: z.enum(TENANT_ROLE_KEY_VALUES),
  canEdit: z.boolean(),
});

export type TenantParam = z.infer<typeof TenantParamSchema>;
export type UpdateTenantRegionBody = z.infer<typeof UpdateTenantRegionBodySchema>;
export type UpdateTenantAllowedOriginsBody = z.infer<typeof UpdateTenantAllowedOriginsBodySchema>;
export type TenantRegion = z.infer<typeof TenantRegionSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
