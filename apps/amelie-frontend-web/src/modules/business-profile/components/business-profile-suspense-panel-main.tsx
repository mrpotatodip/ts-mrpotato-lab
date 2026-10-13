import { Suspense } from "react";

import { LocationSection, LocationSwitcher, useSuspenseLocationSelection } from "#/modules/location";
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
  const selection = useSuspenseLocationSelection();
  const { data } = useSuspenseBusinessProfile(selection.locationId);
  const { canEdit } = useActiveTenantRole();
  const { data: tenants } = useTenants();

  return (
    <div className="flex flex-col gap-8">
      <LocationSwitcher locations={selection.locations} value={selection.locationId} onChange={selection.select} />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <PageCard title="Cafe details" description="Shown to customers by the assistant.">
          <BusinessProfileForm
            key={`${tenants?.activeTenantId ?? "none"}:${selection.locationId ?? "only"}`}
            profile={data}
            canEdit={canEdit}
            locationId={selection.locationId}
          />
        </PageCard>
        <div className="flex flex-col gap-8">
          <BusinessProfileRegion />
          <LocationSection />
        </div>
      </div>
    </div>
  );
}
