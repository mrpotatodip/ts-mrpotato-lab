import { useForm } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { FieldError } from "#/components/ui/field-error";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { fieldAria, fieldMessage } from "#/lib/form-field";
import { usageBudgetError, usageUsd } from "../utils";

type UsageBudgetFormProps = {
  budgetUsd: number;
  floorUsd: number;
  allowanceUsd: number | undefined;
  pending: boolean;
  onSave: (budgetUsd: number) => void;
  onCancel: () => void;
};

const INPUT_ID = "usage-budget";
const HELP_ID = "usage-budget-help";

export function UsageBudgetForm({ budgetUsd, floorUsd, allowanceUsd, pending, onSave, onCancel }: UsageBudgetFormProps) {
  const form = useForm({
    defaultValues: { budget: String(budgetUsd) },
    onSubmit: ({ value }) => onSave(Number(value.budget.trim())),
  });
  const range = allowanceUsd === undefined ? `At least ${usageUsd(floorUsd)}.` : `Between ${usageUsd(floorUsd)} and ${usageUsd(allowanceUsd)}.`;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      className="grid gap-2"
    >
      <form.Field name="budget" validators={{ onSubmit: ({ value }) => usageBudgetError(value, floorUsd, allowanceUsd) }}>
        {(field) => (
          <>
            <Label htmlFor={INPUT_ID}>Monthly budget (USD)</Label>
            <div className="flex items-center gap-2">
              <Input id={INPUT_ID} name={field.name} inputMode="decimal" autoComplete="off" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} className="h-8 w-32 tabular-nums" {...fieldAria(field, INPUT_ID, HELP_ID)} />
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving" : "Save"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <FieldError id={INPUT_ID} message={fieldMessage(field)} />
            <p id={HELP_ID} className="text-sm leading-relaxed text-muted-foreground">
              {range}
            </p>
          </>
        )}
      </form.Field>
    </form>
  );
}
