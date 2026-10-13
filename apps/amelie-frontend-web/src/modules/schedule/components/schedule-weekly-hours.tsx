import type { WeeklyHours } from "@repo/contracts/amelie";
import { PageCard } from "#/modules/shared";
import { ScheduleWeekdayRow } from "./schedule-weekday-row";

type ScheduleWeeklyHoursProps = {
  weekly: WeeklyHours[];
  timezone: string;
  canEdit: boolean;
  locationId?: string;
};

export function ScheduleWeeklyHours({ weekly, timezone, canEdit, locationId }: ScheduleWeeklyHoursProps) {
  return (
    <PageCard title="Weekly hours" description={`Times are in ${timezone}.`}>
      <ul>
        {weekly.map((day, dayOfWeek) => (
          <ScheduleWeekdayRow key={`${day.weekday}:${day.isClosed}:${day.opensAt}:${day.closesAt}`} day={day} dayOfWeek={dayOfWeek} canEdit={canEdit} locationId={locationId} />
        ))}
      </ul>
    </PageCard>
  );
}
