import { z } from "zod";
import {
  TenantIdSchema,
  TenantSchema,
  UpdateTenantAllowedOriginsBodySchema,
  UpdateTenantCustomerChatBodySchema,
  UpdateTenantRegionBodySchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const TenantsResponseSchema = apiResponseSchema(z.array(TenantSchema));

export const TenantResponseSchema = apiResponseSchema(TenantSchema);

export const SwitchTenantInputSchema = z.object({ tenantId: TenantIdSchema });

export const UpdateTenantRegionInputSchema = UpdateTenantRegionBodySchema.extend({ tenantId: TenantIdSchema });

export const UpdateTenantAllowedOriginsInputSchema = UpdateTenantAllowedOriginsBodySchema.extend({
  tenantId: TenantIdSchema,
});

export const UpdateTenantCustomerChatInputSchema = UpdateTenantCustomerChatBodySchema.extend({
  tenantId: TenantIdSchema,
});

export type SwitchTenantInput = z.infer<typeof SwitchTenantInputSchema>;
export type UpdateTenantRegionInput = z.infer<typeof UpdateTenantRegionInputSchema>;
export type UpdateTenantAllowedOriginsInput = z.infer<typeof UpdateTenantAllowedOriginsInputSchema>;
export type UpdateTenantCustomerChatInput = z.infer<typeof UpdateTenantCustomerChatInputSchema>;
