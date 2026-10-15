import { Suspense } from "react";

import { DashboardEmptyPlace } from "#/modules/dashboard/components/dashboard-empty-place";
import { useSuspenseDashboardScope } from "#/modules/dashboard/hooks/use-dashboard-scope";
import { PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useSuspenseTenantHours } from "../hooks";
import { SchedulePanelSkeleton } from "./schedule-panel-skeleton";
import { ScheduleSpecialDateForm } from "./schedule-special-date-form";
import { ScheduleSpecialDates } from "./schedule-special-dates";
import { ScheduleWeeklyHours } from "./schedule-weekly-hours";

// -----
// Weekly hours and special dates, as the assistant tells
// them to Customers. The header shows at once; the rest
// waits behind the skeleton.
// -----
export function ScheduleSuspensePanelMain() {
  return (
    <>
      <PageHeader title="Opening hours" description="Your weekly hours and holiday changes, so the assistant knows when you are open." />
      <Suspense fallback={<SchedulePanelSkeleton />}>
        <SchedulePanelView />
      </Suspense>
    </>
  );
}

function SchedulePanelView() {
  const selection = useSuspenseDashboardScope();
  if (selection.emptyPlace && selection.country) {
    return <DashboardEmptyPlace country={selection.country} />;
  }
  return <ScheduleHoursBody locationId={selection.locationId} />;
}

function ScheduleHoursBody({ locationId }: { locationId: string | undefined }) {
  const { data } = useSuspenseTenantHours(locationId);
  const { canEdit } = useActiveTenantRole();

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="space-y-8">
        {canEdit ? (
          <PageCard title="Add a special date" description="A holiday or other day with different hours.">
            <ScheduleSpecialDateForm locationId={locationId} />
          </PageCard>
        ) : (
          <p className="text-muted-foreground text-xs">Only an owner or manager can change these.</p>
        )}
      </div>
      <div className="space-y-8">
        <ScheduleWeeklyHours weekly={data.weekly} timezone={data.timezone} canEdit={canEdit} locationId={locationId} />
        <ScheduleSpecialDates specialDates={data.specialDates} canEdit={canEdit} locationId={locationId} />
      </div>
    </div>
  );
}
