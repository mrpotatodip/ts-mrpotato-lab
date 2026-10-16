import { z } from "zod";
import { ALLOWED_ORIGINS_MAX, CUSTOMER_CHAT_LABEL_DEFAULT, CUSTOMER_CHAT_LABEL_MAX } from "../constants";
import { COUNTRY_VALUES, CURRENCY_VALUES } from "../enums";

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
// party sees it, with their Role and
// that Role's Powers. country and
// currency are those of the Tenant's first open
// Country; the Tenant row holds neither.
// -----
export const CUSTOMER_CHAT_APPEARANCE_INVALID =
  "The button text must be 1 to 40 characters. The colour must be a #rrggbb hex value, or empty for the default.";

const CUSTOMER_CHAT_ACCENT = /^#[0-9a-fA-F]{6}$/;

export function parseCustomerChatAccent(value: string | null): string | null | undefined {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!CUSTOMER_CHAT_ACCENT.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

export const UpdateTenantCustomerChatBodySchema = z.object({
  customerChatLabel: z
    .string()
    .superRefine((value, ctx) => {
      const label = value.trim();
      if (label.length < 1 || label.length > CUSTOMER_CHAT_LABEL_MAX) {
        ctx.addIssue({ code: "custom", message: CUSTOMER_CHAT_APPEARANCE_INVALID });
      }
    })
    .transform((value) => value.trim() || CUSTOMER_CHAT_LABEL_DEFAULT),
  customerChatAccent: z
    .string()
    .nullable()
    .superRefine((value, ctx) => {
      if (parseCustomerChatAccent(value) === undefined) {
        ctx.addIssue({ code: "custom", message: CUSTOMER_CHAT_APPEARANCE_INVALID });
      }
    })
    .transform((value) => parseCustomerChatAccent(value) ?? null),
});

export const TenantSchema = z.object({
  id: TenantIdSchema,
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  country: z.enum(COUNTRY_VALUES),
  currency: z.enum(CURRENCY_VALUES),
  allowedOrigins: z.array(z.string()),
  customerChatLabel: z.string(),
  customerChatAccent: z.string().nullable(),
  role: z.string(),
  roleLabel: z.string(),
  powers: z.array(z.string()),
});

export type TenantParam = z.infer<typeof TenantParamSchema>;
export type UpdateTenantRegionBody = z.infer<typeof UpdateTenantRegionBodySchema>;
export type UpdateTenantAllowedOriginsBody = z.infer<typeof UpdateTenantAllowedOriginsBodySchema>;
export type UpdateTenantCustomerChatBody = z.infer<typeof UpdateTenantCustomerChatBodySchema>;
export type TenantRegion = z.infer<typeof TenantRegionSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
