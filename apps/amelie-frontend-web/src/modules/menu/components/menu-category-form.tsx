import { useForm } from "@tanstack/react-form";
import { MenuCategoryBodySchema, type MenuCategoryBody } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { toCategoryCandidate, toCategoryFormValues } from "../utils";

type MenuCategoryFormProps = {
  initial: MenuCategoryBody | null;
  submitLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (body: MenuCategoryBody) => void;
  onCancel: (() => void) | null;
};

// -----
// A category's name, and an optional note such
// as "Gluten-free bread +2". Used to add and edit.
// -----
export function MenuCategoryForm({ initial, submitLabel, isPending, error, onSubmit, onCancel }: MenuCategoryFormProps) {
  const form = useForm({
    defaultValues: toCategoryFormValues(initial),
    onSubmit: ({ value }) => {
      const check = MenuCategoryBodySchema.safeParse(toCategoryCandidate(value));
      if (!check.success) return;
      onSubmit(check.data);
      if (initial === null) form.reset();
    },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <Input
            aria-label="Category name"
            placeholder="Name, for example: Coffee"
            maxLength={80}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="note">
        {(field) => (
          <Textarea
            aria-label="Category note"
            placeholder="Note (optional), for example: Gluten-free bread +2"
            maxLength={300}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <form.Subscribe selector={(state) => MenuCategoryBodySchema.safeParse(toCategoryCandidate(state.values)).success}>
          {(valid) => (
            <Button type="submit" size="sm" disabled={!valid || isPending}>
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
