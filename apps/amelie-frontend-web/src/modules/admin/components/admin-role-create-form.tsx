import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import {
  ADMIN_ROLE_DESCRIPTION_MAX,
  ADMIN_ROLE_KEY_MAX,
  ADMIN_ROLE_LABEL_MAX,
  CreateAdminRoleBodySchema,
} from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { useAdminRoleActions } from "../hooks";
import { ADMIN_ROLE_FORM_DEFAULTS, toAdminRoleKey, toCreateAdminRoleBody } from "../utils";

// -----
// Label, key and a note. The key follows the label until
// it is typed over, and never changes after the role exists.
// -----
export function AdminRoleCreateForm() {
  const { create } = useAdminRoleActions();
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: ADMIN_ROLE_FORM_DEFAULTS,
    validators: {
      onChange: ({ value }) => {
        const result = CreateAdminRoleBodySchema.safeParse(toCreateAdminRoleBody(value));
        if (result.success) return undefined;
        return "Use a label, and a key of lower-case letters, digits and underscores.";
      },
    },
    onSubmit: ({ value, formApi }) => {
      const body = CreateAdminRoleBodySchema.parse(toCreateAdminRoleBody(value));
      create.mutate(body, {
        onSuccess: (created) => {
          formApi.reset();
          create.reset();
          void navigate({ to: "/admin/roles/$roleId", params: { roleId: created.id } });
        },
      });
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
      <form.Field name="label">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-role-label" className="stat-label">
              Label
            </label>
            <Input
              id="admin-role-label"
              value={field.state.value}
              maxLength={ADMIN_ROLE_LABEL_MAX}
              placeholder="Shift lead"
              onChange={(event) => {
                field.handleChange(event.target.value);
                if (!form.getFieldMeta("key")?.isDirty) {
                  form.setFieldValue("key", toAdminRoleKey(event.target.value), { dontUpdateMeta: true });
                }
              }}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="key">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-role-key" className="stat-label">
              Key
            </label>
            <Input
              id="admin-role-key"
              className="font-mono"
              value={field.state.value}
              maxLength={ADMIN_ROLE_KEY_MAX}
              placeholder="shift_lead"
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-role-description" className="stat-label">
              Description (optional)
            </label>
            <Textarea
              id="admin-role-description"
              value={field.state.value}
              maxLength={ADMIN_ROLE_DESCRIPTION_MAX}
              placeholder="Runs a shift and can mark items sold out."
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.errors}>
        {(errors) => {
          const message = errors.find(Boolean);
          return message ? <p className="text-destructive text-xs">{String(message)}</p> : null;
        }}
      </form.Subscribe>
      {create.error ? <p className="text-destructive text-xs">{create.error.message}</p> : null}
      <p className="text-muted-foreground text-xs">A new role starts disabled with no powers.</p>
      <div className="mt-2">
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={create.isPending || !canSubmit}>
              {create.isPending ? "Creating..." : "Create role"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
