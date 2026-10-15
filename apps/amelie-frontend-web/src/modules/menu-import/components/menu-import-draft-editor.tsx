import { useId } from "react";
import { useForm } from "@tanstack/react-form";
import type { ImportDraft } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { TEXT_FIELDS } from "../constants";
import { toDraftFields, toDraftFormValues, type DraftFields } from "../utils";

type MenuImportDraftEditorProps = {
  draft: ImportDraft;
  isPending: boolean;
  error: string | null;
  onSave: (data: DraftFields) => void;
  onCancel: () => void;
};

// -----
// Text boxes for the fields a person fixes most; an
// empty box becomes null. The server checks the result
// with the rules of the draft's kind.
// -----
export function MenuImportDraftEditor({ draft, isPending, error, onSave, onCancel }: MenuImportDraftEditorProps) {
  const closedId = useId();
  const fields = TEXT_FIELDS[draft.kind];

  const form = useForm({
    defaultValues: toDraftFormValues(draft),
    onSubmit: ({ value }) => onSave(toDraftFields(draft, value)),
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
      {draft.kind === "business_hours" ? (
        <form.Field name="isClosed">
          {(field) => (
            <div className="flex items-center gap-2">
              <Checkbox id={closedId} checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked === true)} />
              <Label htmlFor={closedId} className="font-normal">
                Closed
              </Label>
            </div>
          )}
        </form.Field>
      ) : null}
      <form.Subscribe selector={(state) => draft.kind === "business_hours" && state.values.isClosed}>
        {(hidden) =>
          hidden
            ? null
            : fields.map((field) => (
                <form.Field key={field.name} name={`text.${field.name}`}>
                  {(box) => (
                    <Input
                      aria-label={field.label}
                      placeholder={field.label}
                      value={box.state.value ?? ""}
                      onChange={(event) => box.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>
              ))
        }
      </form.Subscribe>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
