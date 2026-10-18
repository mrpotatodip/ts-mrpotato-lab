import { useState } from "react";
import type { Location } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { PageCard, PowerMark } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useActiveLocations, useLocationActions, useLocationArchivedNotice, useLocationArchivePreview } from "../hooks";
import { LocationAddForm } from "./location-add-form";
import { LocationArchivedNotice } from "./location-archived-notice";
import { LocationArchiveDialog } from "./location-archive-dialog";
import { LocationRow } from "./location-row";

// -----
// Open Locations in this Country. None: the add
// form. One or several: each can be edited or
// archived, then add another. The "now sold
// nowhere" notice is held in the query cache.
// -----
type LocationSectionProps = {
  countryId?: string;
  inCountry?: string;
};

export function LocationSection({ countryId, inCountry }: LocationSectionProps) {
  const { locations: open } = useActiveLocations();
  const active = countryId ? open.filter((location) => location.countryId === countryId) : open;
  const { can } = useActiveTenantRole();
  const canCreate = can("company:profile:locations:create");
  const canUpdate = can("company:profile:locations:update");
  const canArchive = can("company:profile:locations:archive");
  const { archiveLocation } = useLocationActions();
  const { notice, dismiss } = useLocationArchivedNotice();
  const [confirming, setConfirming] = useState<Location | null>(null);
  const membersWithoutLocation = useLocationArchivePreview(confirming?.id ?? null);

  const noticeView = notice ? <LocationArchivedNotice notice={notice} onDismiss={dismiss} /> : null;

  if (active.length === 0) {
    if (!canCreate) return noticeView;
    return (
      <>
        {noticeView}
        <PageCard
          title={inCountry ? `Locations · ${inCountry}` : "Locations"}
          description={inCountry ? `${inCountry} has no open location. Add one for a phone and address.` : "This country has no open location. Add one for a phone and address."}
          action={<PowerMark power="company:profile:locations:create" />}
        >
          <LocationAddForm lockedCountryId={countryId} />
        </PageCard>
      </>
    );
  }

  return (
    <>
      {noticeView}
      <LocationList
        active={active}
        countryId={countryId}
        inCountry={inCountry}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canArchive={canArchive}
        onArchive={setConfirming}
        isArchiving={archiveLocation.isPending}
        archiveError={archiveLocation.isError ? archiveLocation.error.message : null}
      />
      <LocationArchiveDialog
        location={confirming}
        isPending={archiveLocation.isPending}
        membersWithoutLocation={membersWithoutLocation}
        onCancel={() => setConfirming(null)}
        onConfirm={(location) => {
          setConfirming(null);
          archiveLocation.mutate({ data: { locationId: location.id } });
        }}
      />
    </>
  );
}

type LocationListProps = {
  active: Location[];
  countryId?: string;
  inCountry?: string;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  onArchive: (location: Location) => void;
  isArchiving: boolean;
  archiveError: string | null;
};

function LocationList({
  active,
  countryId,
  inCountry,
  canCreate,
  canUpdate,
  canArchive,
  onArchive,
  isArchiving,
  archiveError,
}: LocationListProps) {
  const [adding, setAdding] = useState(false);

  return (
    <PageCard
      title={inCountry ? `Locations · ${inCountry}` : "Locations"}
      description={inCountry ? `The name, address, phone and timezone of each place in ${inCountry}.` : "The name, address, phone and timezone of each place in this country."}
      contentClassName="p-0"
      action={<PowerMark power="company:profile:locations:read" />}
    >
      <ul className="divide-y">
        {active.map((location) => (
          <LocationRow
            key={location.id}
            location={location}
            canUpdate={canUpdate}
            canArchive={canArchive}
            onArchive={onArchive}
            isArchiving={isArchiving}
          />
        ))}
      </ul>
      {archiveError ? (
        <p role="alert" className="px-6 pt-4 text-xs text-destructive">
          {archiveError}
        </p>
      ) : null}
      {canCreate ? (
        <div className="border-t p-6">
          {adding ? (
            <LocationAddForm lockedCountryId={countryId} onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <div className="flex items-center gap-2">
              <PowerMark power="company:profile:locations:create" />
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
                Add location
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </PageCard>
  );
}
