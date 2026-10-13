import { Check, X } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { SetWeeklyHoursBodySchema, type SetWeeklyHoursBody } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { toHoursBody, toHoursValues } from "../utils";
import { ScheduleHoursFields } from "./schedule-hours-fields";

type ScheduleWeekdayFormProps = {
  weekday: string;
  initial: { isClosed: boolean; opensAt: string | null; closesAt: string | null };
  isPending: boolean;
  error: string | null;
  onSubmit: (body: SetWeeklyHoursBody) => void;
  onCancel: () => void;
};

// -----
// Edits one weekday. A closed day sends no times,
// like the server expects.
// -----
export function ScheduleWeekdayForm({ weekday, initial, isPending, error, onSubmit, onCancel }: ScheduleWeekdayFormProps) {
  const form = useForm({
    defaultValues: toHoursValues(initial),
    onSubmit: ({ value }) => {
      const check = SetWeeklyHoursBodySchema.safeParse(toHoursBody(value));
      if (check.success) onSubmit(check.data);
    },
  });

  return (
    <form
      className="flex flex-wrap items-center justify-between gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <p className="w-28 text-sm font-medium">{weekday}</p>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <ScheduleHoursFields
            {...values}
            onChange={(next) => {
              form.setFieldValue("isClosed", next.isClosed);
              form.setFieldValue("opensAt", next.opensAt);
              form.setFieldValue("closesAt", next.closesAt);
            }}
          />
        )}
      </form.Subscribe>
      <form.Subscribe selector={(state) => SetWeeklyHoursBodySchema.safeParse(toHoursBody(state.values))}>
        {(check) => (
          <>
            <div className="flex gap-1">
              <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Save ${weekday}`} title="Save" disabled={!check.success || isPending}>
                <Check />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" title="Cancel" onClick={onCancel}>
                <X />
              </Button>
            </div>
            {(check.success ? error : check.error.issues[0]?.message) ? (
              <p className="w-full text-xs text-destructive">{check.success ? error : check.error.issues[0]?.message}</p>
            ) : null}
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
