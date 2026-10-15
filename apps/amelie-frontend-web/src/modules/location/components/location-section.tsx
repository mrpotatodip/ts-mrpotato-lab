import { useState } from "react";
import type { Location } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { PageCard } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useActiveLocations, useLocationActions, useLocationArchivedNotice } from "../hooks";
import { LocationAddForm } from "./location-add-form";
import { LocationArchivedNotice } from "./location-archived-notice";
import { LocationArchiveDialog } from "./location-archive-dialog";
import { LocationRow } from "./location-row";

// -----
// With one Location the cafe sees only a quiet
// way to add a second. With several, each one
// can be edited or archived. The "now sold nowhere"
// notice is held in the query cache, so it stays up
// when the page reloads and the section is rebuilt.
// -----
export function LocationSection() {
  const { locations: active } = useActiveLocations();
  const { canEdit } = useActiveTenantRole();
  const { archiveLocation } = useLocationActions();
  const { notice, dismiss } = useLocationArchivedNotice();
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<Location | null>(null);

  const noticeView = notice ? <LocationArchivedNotice notice={notice} onDismiss={dismiss} /> : null;

  if (active.length === 0 || !canEdit) {
    return (
      <>
        {noticeView}
        {active.length > 1 ? <LocationList active={active} canEdit={false} onArchive={setConfirming} isArchiving={false} archiveError={null} /> : null}
      </>
    );
  }

  if (active.length === 1) {
    return (
      <>
        {noticeView}
        <PageCard title="Locations" description="Your cafe has one location. Add another if you run more than one place.">
          {adding ? (
            <LocationAddForm onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <Button variant="link" size="sm" className="text-muted-foreground h-auto w-fit px-0" onClick={() => setAdding(true)}>
              More than one place? Add a location
            </Button>
          )}
        </PageCard>
      </>
    );
  }

  return (
    <>
      {noticeView}
      <LocationList
        active={active}
        canEdit
        onArchive={setConfirming}
        isArchiving={archiveLocation.isPending}
        archiveError={archiveLocation.isError ? archiveLocation.error.message : null}
      />
      <LocationArchiveDialog
        location={confirming}
        isPending={archiveLocation.isPending}
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
  canEdit: boolean;
  onArchive: (location: Location) => void;
  isArchiving: boolean;
  archiveError: string | null;
};

function LocationList({ active, canEdit, onArchive, isArchiving, archiveError }: LocationListProps) {
  const [adding, setAdding] = useState(false);

  return (
    <PageCard title="Locations" description="The name, address, phone and timezone of each place." contentClassName="p-0">
      <ul className="divide-y">
        {active.map((location) => (
          <LocationRow key={location.id} location={location} canEdit={canEdit} onArchive={onArchive} isArchiving={isArchiving} />
        ))}
      </ul>
      {archiveError ? (
        <p role="alert" className="px-6 pt-4 text-xs text-destructive">
          {archiveError}
        </p>
      ) : null}
      {canEdit ? (
        <div className="border-t p-6">
          {adding ? (
            <LocationAddForm onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
              Add location
            </Button>
          )}
        </div>
      ) : null}
    </PageCard>
  );
}
