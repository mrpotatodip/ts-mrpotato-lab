import type { WeeklyHours } from "@repo/contracts/amelie";
import { PageCard, PowerMark } from "#/modules/shared";
import { ScheduleWeekdayRow } from "./schedule-weekday-row";

type ScheduleWeeklyHoursProps = {
  weekly: WeeklyHours[];
  timezone: string;
  canEdit: boolean;
  locationId?: string;
};

export function ScheduleWeeklyHours({ weekly, timezone, canEdit, locationId }: ScheduleWeeklyHoursProps) {
  return (
    <PageCard
      title="Weekly hours"
      description={`Times are in ${timezone}.`}
      action={canEdit ? <PowerMark power="store:hours:weekly:update" /> : undefined}
    >
      <ul>
        {weekly.map((day, dayOfWeek) => (
          <ScheduleWeekdayRow key={`${day.weekday}:${day.isClosed}:${day.opensAt}:${day.closesAt}`} day={day} dayOfWeek={dayOfWeek} canEdit={canEdit} locationId={locationId} />
        ))}
      </ul>
    </PageCard>
  );
}
