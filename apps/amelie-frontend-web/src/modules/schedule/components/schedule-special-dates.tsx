import type { SpecialDate } from "@repo/contracts/amelie";

import { Trash2 } from "lucide-react";

import { Button } from "#/components/ui/button";
import { PageCard } from "#/modules/shared";
import { useTenantHoursActions } from "../hooks";
import { describeHours } from "../utils";

type ScheduleSpecialDatesProps = {
  specialDates: SpecialDate[];
  canEdit: boolean;
  locationId?: string;
};

export function ScheduleSpecialDates({ specialDates, canEdit, locationId }: ScheduleSpecialDatesProps) {
  const { removeDate } = useTenantHoursActions(locationId);

  return (
    <PageCard title="Special dates" description="Holidays and other days with different hours." contentClassName="p-0">
      {specialDates.length === 0 ? (
        <p className="text-muted-foreground p-6 text-sm">No special dates coming up.</p>
      ) : (
        <ul className="divide-y">
          {specialDates.map((date) => (
            <li key={date.date} className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{date.date}</p>
                <p className="text-muted-foreground text-sm">
                  {describeHours(date)}
                  {date.note ? ` · ${date.note}` : ""}
                </p>
              </div>
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${date.date}`}
                  title="Remove"
                  disabled={removeDate.isPending}
                  onClick={() => removeDate.mutate({ data: { date: date.date } })}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {removeDate.isError ? <p className="px-6 pb-4 text-xs text-destructive">{removeDate.error.message}</p> : null}
    </PageCard>
  );
}
