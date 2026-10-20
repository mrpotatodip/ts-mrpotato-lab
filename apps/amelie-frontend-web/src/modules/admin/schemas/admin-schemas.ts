import { z } from "zod";
import {
  AdminAuditLogSchema,
  AdminRoleIdSchema,
  AdminRoleDeletedSchema,
  AdminRoleDetailSchema,
  AdminRolesSchema,
  CreatedInviteCodeSchema,
  InviteCodeSchema,
  MeSchema,
  SetAdminRoleEnabledBodySchema,
  SetAdminRolePowersBodySchema,
  UpdateAdminRoleBodySchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const AdminAccessResponseSchema = apiResponseSchema(MeSchema);

export const InviteCodeListResponseSchema = apiResponseSchema(z.array(InviteCodeSchema));
export const InviteCodeResponseSchema = apiResponseSchema(InviteCodeSchema);
export const CreatedInviteCodeResponseSchema = apiResponseSchema(CreatedInviteCodeSchema);

// -----
// What the generator form holds. Every field is a string,
// as typed; toCreateInviteCodeBody turns it into the body.
// -----
export const InviteCodeFormValuesSchema = z.object({
  note: z.string(),
  maxUses: z.string(),
  expiresAt: z.string(),
});

export type InviteCodeFormValues = z.infer<typeof InviteCodeFormValuesSchema>;

export const AdminRoleListResponseSchema = apiResponseSchema(AdminRolesSchema);
export const AdminRoleDetailResponseSchema = apiResponseSchema(AdminRoleDetailSchema);
export const AdminRoleDeletedResponseSchema = apiResponseSchema(AdminRoleDeletedSchema);
export const AdminAuditLogResponseSchema = apiResponseSchema(AdminAuditLogSchema);

export const UpdateAdminRoleInputSchema = z.object({ roleId: AdminRoleIdSchema, body: UpdateAdminRoleBodySchema });
export const SetAdminRoleEnabledInputSchema = z.object({ roleId: AdminRoleIdSchema, body: SetAdminRoleEnabledBodySchema });
export const SetAdminRolePowersInputSchema = z.object({ roleId: AdminRoleIdSchema, body: SetAdminRolePowersBodySchema });

export const AdminRoleFormValuesSchema = z.object({
  label: z.string(),
  key: z.string(),
  description: z.string(),
});

export const AdminAuditSummarySchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
});

export const AdminAuditBindableSchema = z.object({ canBeBound: z.boolean() });
export const AdminAuditPowersSchema = z.object({ powers: z.array(z.string()) });

export type AdminRoleFormValues = z.infer<typeof AdminRoleFormValuesSchema>;
export type AdminAuditSummary = z.infer<typeof AdminAuditSummarySchema>;
export type AdminAuditPowers = z.infer<typeof AdminAuditPowersSchema>;
