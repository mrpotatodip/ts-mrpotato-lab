import { useForm } from "@tanstack/react-form";
import {
  CreateInviteCodeBodySchema,
  INVITE_CODE_MAX_USES_LIMIT,
  INVITE_CODE_NOTE_MAX,
  type CreatedInviteCode,
} from "@repo/contracts/amelie";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useInviteCodeActions } from "../hooks";
import { INVITE_CODE_FORM_DEFAULTS, toCreateInviteCodeBody } from "../utils";

type AdminInviteCodeFormProps = {
  onCreated: (created: CreatedInviteCode) => void;
};

// -----
// Note, max uses and an optional expiry. The
// contract's body schema is the one rule set.
// -----
export function AdminInviteCodeForm({ onCreated }: AdminInviteCodeFormProps) {
  const { create } = useInviteCodeActions();
  const form = useForm({
    defaultValues: INVITE_CODE_FORM_DEFAULTS,
    validators: {
      onChange: ({ value }) => {
        const result = CreateInviteCodeBodySchema.safeParse(toCreateInviteCodeBody(value));
        if (result.success) return undefined;
        return result.error.issues.map((issue) => issue.message).join(", ");
      },
    },
    onSubmit: ({ value, formApi }) => {
      const body = CreateInviteCodeBodySchema.parse(toCreateInviteCodeBody(value));
      create.mutate(body, {
        onSuccess: (created) => {
          formApi.reset();
          create.reset();
          onCreated(created);
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
      <form.Field name="note">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-code-note" className="stat-label">
              Note
            </label>
            <Input
              id="invite-code-note"
              value={field.state.value}
              maxLength={INVITE_CODE_NOTE_MAX}
              placeholder="Who is this for?"
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>
      <div className="grid grid-cols-1 gap-4">
        <form.Field name="maxUses">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-code-max-uses" className="stat-label">
                Max uses
              </label>
              <Input
                id="invite-code-max-uses"
                type="number"
                inputMode="numeric"
                min={1}
                max={INVITE_CODE_MAX_USES_LIMIT}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="expiresAt">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-code-expires-at" className="stat-label">
                Expires (optional)
              </label>
              <Input
                id="invite-code-expires-at"
                type="datetime-local"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.errors}>
        {(errors) => {
          const message = errors.find(Boolean);
          return message ? <p className="text-destructive text-sm">{String(message)}</p> : null;
        }}
      </form.Subscribe>
      {create.error ? <p className="text-destructive text-sm">{create.error.message}</p> : null}
      <div>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={create.isPending || !canSubmit}>
              {create.isPending ? "Generating..." : "Generate code"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
