import type { CreateAdminRoleBody, UpdateAdminRoleBody } from "@repo/contracts/amelie";
import type { AdminRoleFormValues } from "../schemas";

export const ADMIN_ROLE_FORM_DEFAULTS: AdminRoleFormValues = { label: "", key: "", description: "" };

export function toCreateAdminRoleBody(values: AdminRoleFormValues): CreateAdminRoleBody {
  const description = values.description.trim();
  return { key: values.key.trim(), label: values.label.trim(), description: description === "" ? null : description };
}

export function toUpdateAdminRoleBody(values: Pick<AdminRoleFormValues, "label" | "description">): UpdateAdminRoleBody {
  const description = values.description.trim();
  return { label: values.label.trim(), description: description === "" ? null : description };
}
