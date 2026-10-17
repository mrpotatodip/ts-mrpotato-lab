import { Suspense } from "react";

import { CountryAddLink } from "#/modules/country";
import { useSuspenseDashboardScope } from "#/modules/dashboard/hooks/use-dashboard-scope";
import { LocationSection } from "#/modules/location";
import { countryName, PageCard, PageHeader, PowerMark } from "#/modules/shared";
import { useActiveTenantRole, useTenants } from "#/modules/tenant";
import { useSuspenseBusinessProfile } from "../hooks";
import { BusinessProfileForm } from "./business-profile-form";
import { BusinessProfilePanelSkeleton } from "./business-profile-panel-skeleton";

// -----
// The contact facts the assistant tells Customers. The
// header shows at once; the rest waits behind the skeleton.
// -----
const PROFILE_INTRO = "What the assistant tells customers about your cafe: name, contact and address.";

export function BusinessProfileSuspensePanelMain() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Business profile" description={PROFILE_INTRO} />
          <BusinessProfilePanelSkeleton />
        </>
      }
    >
      <BusinessProfilePanelView />
    </Suspense>
  );
}

// -----
// Keyed by the cafe and Location, so switching
// either starts the form over with its data.
// Phone and address are the chosen Location's.
// Country and Location are the sidebar pick.
// This column is how you add another Country, and
// how you add or edit Locations in the picked Country.
// -----
function BusinessProfilePanelView() {
  const selection = useSuspenseDashboardScope();
  const { data } = useSuspenseBusinessProfile(selection.profileLocationId);
  const { can } = useActiveTenantRole();
  const canEdit = can("company:profile:business_profile:update");
  const { data: tenants } = useTenants();
  const emptyPlace = selection.emptyPlace && selection.country;
  const inCountry = selection.country ? countryName(selection.country.country) : null;

  return (
    <>
      <PageHeader
        title="Business profile"
        description={inCountry ? `${inCountry}. ${PROFILE_INTRO}` : PROFILE_INTRO}
        power="company:profile:business_profile:read"
      />
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <PageCard
        title={inCountry ? `Cafe details · ${inCountry}` : "Cafe details"}
        description={
          emptyPlace
            ? `Description, website and email are cafe-wide. Add a location in ${countryName(emptyPlace.country)} for phone and address.`
            : "Shown to customers by the assistant."
        }
        action={canEdit ? <PowerMark power="company:profile:business_profile:update" /> : undefined}
      >
        <BusinessProfileForm
          key={`${tenants?.activeTenantId ?? "none"}:${selection.profileLocationId ?? "only"}:${emptyPlace ? "empty" : "place"}`}
          profile={data}
          canEdit={canEdit}
          locationId={selection.profileLocationId}
          showPlaceFields={!selection.emptyPlace}
        />
      </PageCard>
      <div className="flex flex-col gap-8">
        <LocationSection
          key={selection.country?.id ?? "none"}
          countryId={selection.country?.id}
          inCountry={inCountry ?? undefined}
        />
        <CountryAddLink />
      </div>
      </div>
    </>
  );
}
