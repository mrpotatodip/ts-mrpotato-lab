import { useForm } from "@tanstack/react-form";
import {
  ADMIN_ROLE_DESCRIPTION_MAX,
  ADMIN_ROLE_LABEL_MAX,
  UpdateAdminRoleBodySchema,
  type AdminRoleDetail,
} from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { useAdminRoleActions } from "../hooks";
import { toUpdateAdminRoleBody } from "../utils";

type AdminRoleDetailsFormProps = {
  role: AdminRoleDetail;
};

// -----
// Label and description. The key is shown, never edited:
// invites and history point at it.
// -----
export function AdminRoleDetailsForm({ role }: AdminRoleDetailsFormProps) {
  const { update } = useAdminRoleActions();
  const form = useForm({
    defaultValues: { label: role.label, description: role.description ?? "" },
    validators: {
      onChange: ({ value }) =>
        UpdateAdminRoleBodySchema.safeParse(toUpdateAdminRoleBody(value)).success
          ? undefined
          : "A role needs a label.",
    },
    onSubmit: ({ value, formApi }) => {
      const body = UpdateAdminRoleBodySchema.parse(toUpdateAdminRoleBody(value));
      update.mutate(
        { roleId: role.id, body },
        { onSuccess: () => formApi.reset(value) },
      );
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <span className="stat-label">Key</span>
        <p className="font-mono text-sm">{role.key}</p>
      </div>
      <form.Field name="label">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-role-detail-label" className="stat-label">
              Label
            </label>
            <Input
              id="admin-role-detail-label"
              value={field.state.value}
              maxLength={ADMIN_ROLE_LABEL_MAX}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-role-detail-description" className="stat-label">
              Description
            </label>
            <Textarea
              id="admin-role-detail-description"
              value={field.state.value}
              maxLength={ADMIN_ROLE_DESCRIPTION_MAX}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>
      {update.error ? <p className="text-destructive text-xs">{update.error.message}</p> : null}
      <div className="mt-2">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isDirty] as const}>
          {([canSubmit, isDirty]) => (
            <Button type="submit" size="sm" disabled={update.isPending || !canSubmit || !isDirty}>
              {update.isPending ? "Saving..." : "Save details"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
