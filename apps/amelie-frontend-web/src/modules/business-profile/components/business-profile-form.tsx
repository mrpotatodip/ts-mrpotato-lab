import { useForm } from "@tanstack/react-form";
import { UpdateBusinessProfileBodySchema, type BusinessProfile } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { TEXT_FIELDS } from "../constants";
import { useBusinessProfileActions } from "../hooks";
import { toProfileBody, toProfileValues } from "../utils";

type BusinessProfileFormProps = {
  profile: BusinessProfile;
  canEdit: boolean;
  locationId?: string;
};

const LABEL_CLASS = "flex flex-col gap-1.5 text-sm";

// -----
// The dashboard sends the whole profile; an
// empty box clears that field.
// -----
export function BusinessProfileForm({ profile, canEdit, locationId }: BusinessProfileFormProps) {
  const { save } = useBusinessProfileActions(locationId);

  const form = useForm({
    defaultValues: toProfileValues(profile),
    validators: {
      onChange: ({ value }) => {
        const result = UpdateBusinessProfileBodySchema.safeParse(toProfileBody(value));
        if (result.success) return undefined;
        return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
      },
    },
    onSubmit: ({ value }) =>
      save.mutate(UpdateBusinessProfileBodySchema.parse(toProfileBody(value)), {
        onSuccess: (saved) => form.reset(toProfileValues(saved)),
      }),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.Field name="description">
        {(field) => (
          <label htmlFor="profile-description" className={LABEL_CLASS}>
            Description
            <Textarea
              id="profile-description"
              placeholder="A family-run cafe serving breakfast and coffee."
              value={field.state.value}
              disabled={!canEdit}
              maxLength={500}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </label>
        )}
      </form.Field>
      {TEXT_FIELDS.map(({ name, label, placeholder, type }) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <label htmlFor={`profile-${name}`} className={LABEL_CLASS}>
              {label}
              <Input
                id={`profile-${name}`}
                placeholder={placeholder}
                type={type}
                value={field.state.value}
                disabled={!canEdit}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
      ))}
      <form.Field name="address">
        {(field) => (
          <label htmlFor="profile-address" className={LABEL_CLASS}>
            Address
            <Textarea
              id="profile-address"
              placeholder="12 Main Street, Springfield"
              value={field.state.value}
              disabled={!canEdit}
              maxLength={200}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </label>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.errors}>
        {(errors) => (errors.length > 0 ? <p className="text-xs text-destructive">{errors.join(", ")}</p> : null)}
      </form.Subscribe>
      {save.isError ? <p className="text-xs text-destructive">{save.error.message}</p> : null}
      {save.isSuccess && !form.state.isDirty ? <p className="text-muted-foreground text-xs">Saved.</p> : null}

      {canEdit ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Only an owner or manager can change this.</p>
      )}
    </form>
  );
}
