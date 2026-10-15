import { Suspense } from "react";

import { DashboardEmptyPlace } from "#/modules/dashboard/components/dashboard-empty-place";
import { useSuspenseDashboardScope } from "#/modules/dashboard/hooks/use-dashboard-scope";
import { LocationSection } from "#/modules/location";
import { PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole, useTenants } from "#/modules/tenant";
import { useSuspenseBusinessProfile } from "../hooks";
import { BusinessProfileForm } from "./business-profile-form";
import { BusinessProfilePanelSkeleton } from "./business-profile-panel-skeleton";
import { BusinessProfileRegion } from "./business-profile-region";

// -----
// The contact facts the assistant tells Customers. The
// header shows at once; the rest waits behind the skeleton.
// -----
export function BusinessProfileSuspensePanelMain() {
  return (
    <>
      <PageHeader title="Business profile" description="What the assistant tells customers about your cafe: name, contact, address, country and locations." />
      <Suspense fallback={<BusinessProfilePanelSkeleton />}>
        <BusinessProfilePanelView />
      </Suspense>
    </>
  );
}

// -----
// Keyed by the cafe and Location, so switching
// either starts the form over with its data.
// Phone and address are the chosen Location's.
// Region and Locations are the cafe's, so they
// sit beside the details, not inside the form.
// -----
function BusinessProfilePanelView() {
  const selection = useSuspenseDashboardScope();
  if (selection.emptyPlace && selection.country) {
    return (
      <div className="flex flex-col gap-8">
        <DashboardEmptyPlace country={selection.country} />
        <LocationSection />
      </div>
    );
  }
  return <BusinessProfileDetails locationId={selection.locationId} />;
}

function BusinessProfileDetails({ locationId }: { locationId: string | undefined }) {
  const { data } = useSuspenseBusinessProfile(locationId);
  const { canEdit } = useActiveTenantRole();
  const { data: tenants } = useTenants();

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard title="Cafe details" description="Shown to customers by the assistant.">
        <BusinessProfileForm
          key={`${tenants?.activeTenantId ?? "none"}:${locationId ?? "only"}`}
          profile={data}
          canEdit={canEdit}
          locationId={locationId}
        />
      </PageCard>
      <div className="flex flex-col gap-8">
        <BusinessProfileRegion />
        <LocationSection />
      </div>
    </div>
  );
}
