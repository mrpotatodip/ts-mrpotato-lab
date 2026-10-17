import { z } from "zod";

export const ADMIN_ROLE_KEY_MAX = 63;
export const ADMIN_ROLE_KEY_PATTERN = new RegExp(`^[a-z][a-z0-9_]{1,${ADMIN_ROLE_KEY_MAX - 1}}$`);
export const ADMIN_ROLE_LABEL_MAX = 60;
export const ADMIN_ROLE_DESCRIPTION_MAX = 300;
export const ADMIN_ROLE_POWERS_MAX = 500;
export const ADMIN_AUDIT_LIMIT_DEFAULT = 50;
export const ADMIN_AUDIT_LIMIT_MAX = 200;

export const AdminRoleIdSchema = z.uuid();

export const AdminRoleParamSchema = z.object({
  roleId: AdminRoleIdSchema,
});

const AdminRoleLabelSchema = z.string().trim().min(1).max(ADMIN_ROLE_LABEL_MAX);
const AdminRoleDescriptionSchema = z.string().trim().max(ADMIN_ROLE_DESCRIPTION_MAX).nullable();

export const CreateAdminRoleBodySchema = z.object({
  key: z.string().trim().regex(ADMIN_ROLE_KEY_PATTERN),
  label: AdminRoleLabelSchema,
  description: AdminRoleDescriptionSchema.optional(),
});

export const UpdateAdminRoleBodySchema = z
  .object({
    label: AdminRoleLabelSchema.optional(),
    description: AdminRoleDescriptionSchema.optional(),
  })
  .refine((body) => body.label !== undefined || body.description !== undefined);

export const SetAdminRoleEnabledBodySchema = z.object({
  enabled: z.boolean(),
});

export const SetAdminRolePowersBodySchema = z.object({
  powers: z.array(z.string().min(1)).max(ADMIN_ROLE_POWERS_MAX),
});

export const AdminAuditQuerySchema = z.object({
  roleId: AdminRoleIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_AUDIT_LIMIT_MAX).default(ADMIN_AUDIT_LIMIT_DEFAULT),
});

export const AdminRoleSchema = z.object({
  id: AdminRoleIdSchema,
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  scope: z.enum(["tenant", "platform"]),
  enabled: z.boolean(),
  isSystem: z.boolean(),
  powerCount: z.number().int(),
  holderCount: z.number().int(),
});

export const AdminRoleDetailSchema = AdminRoleSchema.extend({
  powers: z.array(z.string()),
});

export const AdminRolesSchema = z.array(AdminRoleSchema);

export const AdminRoleDeletedSchema = z.object({ id: AdminRoleIdSchema });

export const AdminAuditEntrySchema = z.object({
  id: z.uuid(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  subjectId: z.uuid(),
  before: z.json(),
  after: z.json(),
  createdAt: z.iso.datetime(),
});

export const AdminAuditLogSchema = z.array(AdminAuditEntrySchema);

export type AdminRoleParam = z.infer<typeof AdminRoleParamSchema>;
export type CreateAdminRoleBody = z.infer<typeof CreateAdminRoleBodySchema>;
export type UpdateAdminRoleBody = z.infer<typeof UpdateAdminRoleBodySchema>;
export type SetAdminRoleEnabledBody = z.infer<typeof SetAdminRoleEnabledBodySchema>;
export type SetAdminRolePowersBody = z.infer<typeof SetAdminRolePowersBodySchema>;
export type AdminAuditQuery = z.infer<typeof AdminAuditQuerySchema>;
export type AdminRole = z.infer<typeof AdminRoleSchema>;
export type AdminRoleDetail = z.infer<typeof AdminRoleDetailSchema>;
export type AdminRoles = z.infer<typeof AdminRolesSchema>;
export type AdminRoleDeleted = z.infer<typeof AdminRoleDeletedSchema>;
export type AdminAuditEntry = z.infer<typeof AdminAuditEntrySchema>;
export type AdminAuditLog = z.infer<typeof AdminAuditLogSchema>;
