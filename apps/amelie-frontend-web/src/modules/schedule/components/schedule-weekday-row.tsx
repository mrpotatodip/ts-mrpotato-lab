import { Pencil } from "lucide-react";
import { useState } from "react";
import type { WeeklyHours } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { useTenantHoursActions } from "../hooks";
import { describeHours } from "../utils";
import { ScheduleWeekdayForm } from "./schedule-weekday-form";

type ScheduleWeekdayRowProps = {
  day: WeeklyHours;
  dayOfWeek: number;
  canEdit: boolean;
  locationId?: string;
};

const describe = (day: WeeklyHours): string => (day.isSet ? describeHours(day) : "Not set");

export function ScheduleWeekdayRow({ day, dayOfWeek, canEdit, locationId }: ScheduleWeekdayRowProps) {
  const { saveWeekday } = useTenantHoursActions(locationId);
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="border-b py-3 last:border-b-0">
        <ScheduleWeekdayForm
          weekday={day.weekday}
          initial={day}
          isPending={saveWeekday.isPending}
          error={saveWeekday.isError ? saveWeekday.error.message : null}
          onSubmit={(body) => saveWeekday.mutate({ data: { dayOfWeek, ...body } }, { onSuccess: () => setIsEditing(false) })}
          onCancel={() => {
            saveWeekday.reset();
            setIsEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3">
        <p className="w-28 text-sm font-medium">{day.weekday}</p>
        <p className="text-muted-foreground text-sm">{describe(day)}</p>
      </div>
      {canEdit ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${day.weekday}`} title="Edit" onClick={() => setIsEditing(true)}>
          <Pencil />
        </Button>
      ) : null}
    </li>
  );
}
