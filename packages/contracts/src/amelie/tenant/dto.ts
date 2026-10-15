import { z } from "zod";
import { TENANT_ALLOWED_ORIGINS_MAX } from "../constants";
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

const toHttpOrigin = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
};

export const AllowedOriginInputSchema = z.string().transform((value, ctx) => {
  const origin = toHttpOrigin(value);
  if (!origin) {
    ctx.addIssue({ code: "custom", message: "Must be an http or https website" });
    return z.NEVER;
  }
  return origin;
});

export const UpdateTenantAllowedOriginsBodySchema = z.object({
  allowedOrigins: z
    .array(AllowedOriginInputSchema)
    .transform((origins) => {
      const unique: string[] = [];
      for (const origin of origins) {
        if (!unique.includes(origin)) unique.push(origin);
      }
      return unique;
    })
    .refine((origins) => origins.length <= TENANT_ALLOWED_ORIGINS_MAX, {
      message: `At most ${TENANT_ALLOWED_ORIGINS_MAX} Allowed origins`,
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
export type TenantRegion = z.infer<typeof TenantRegionSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type UpdateTenantAllowedOriginsBody = z.infer<typeof UpdateTenantAllowedOriginsBodySchema>;
