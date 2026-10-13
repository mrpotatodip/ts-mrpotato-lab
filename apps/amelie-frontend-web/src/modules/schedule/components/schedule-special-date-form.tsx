import { useForm } from "@tanstack/react-form";
import { SetHoursOverrideBodySchema } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useTenantHoursActions } from "../hooks";
import type { SpecialDateFormValues } from "../schemas";
import { EMPTY_SPECIAL_DATE_VALUES, toHoursBody, toSpecialDateNote } from "../utils";
import { ScheduleHoursFields } from "./schedule-hours-fields";

const toBody = (values: SpecialDateFormValues) => ({ ...toHoursBody(values), note: toSpecialDateNote(values.note) });

// -----
// Adds or replaces the hours of one date, such
// as a holiday. The server rejects a past date.
// -----
export function ScheduleSpecialDateForm({ locationId }: { locationId?: string }) {
  const { saveSpecialDate } = useTenantHoursActions(locationId);

  const form = useForm({
    defaultValues: EMPTY_SPECIAL_DATE_VALUES,
    onSubmit: ({ value }) => {
      if (!SetHoursOverrideBodySchema.safeParse(toBody(value)).success || !value.date) return;
      saveSpecialDate.mutate({ data: { date: value.date, ...toBody(value) } }, { onSuccess: () => form.reset() });
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
      <div className="flex flex-col gap-3">
        <form.Field name="date">
          {(field) => (
            <Input type="date" aria-label="Date" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
          )}
        </form.Field>
        <form.Field name="note">
          {(field) => (
            <Input
              type="text"
              aria-label="Note"
              placeholder="Note, for example Christmas"
              maxLength={120}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <ScheduleHoursFields
            isClosed={values.isClosed}
            opensAt={values.opensAt}
            closesAt={values.closesAt}
            onChange={(next) => {
              form.setFieldValue("isClosed", next.isClosed);
              form.setFieldValue("opensAt", next.opensAt);
              form.setFieldValue("closesAt", next.closesAt);
            }}
          />
        )}
      </form.Subscribe>
      <form.Subscribe selector={(state) => ({ check: SetHoursOverrideBodySchema.safeParse(toBody(state.values)), hasDate: state.values.date !== "" })}>
        {({ check, hasDate }) => (
          <>
            {!check.success ? <p className="text-xs text-destructive">{check.error.issues[0]?.message}</p> : null}
            {saveSpecialDate.isError ? <p className="text-xs text-destructive">{saveSpecialDate.error.message}</p> : null}
            <Button type="submit" size="sm" className="w-fit" disabled={!check.success || !hasDate || saveSpecialDate.isPending}>
              Save special date
            </Button>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
