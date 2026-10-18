import type { Location, LocationArchivePreview } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

type LocationArchiveDialogProps = {
  location: Location | null;
  isPending: boolean;
  membersWithoutLocation?: LocationArchivePreview["membersWithoutLocation"];
  onConfirm: (location: Location) => void;
  onCancel: () => void;
};

// -----
// Asks before archiving; open while a Location is
// -----
export function LocationArchiveDialog({ location, isPending, membersWithoutLocation, onConfirm, onCancel }: LocationArchiveDialogProps) {
  return (
    <Dialog
      open={location !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {location?.name}?</DialogTitle>
          <DialogDescription>
            Customers will no longer be offered it, and menu items sold only here will be sold nowhere.
          </DialogDescription>
        </DialogHeader>
        {membersWithoutLocation && membersWithoutLocation.length > 0 ? (
          <div className="space-y-2 text-sm">
            <p className="text-status-warning font-medium">
              {membersWithoutLocation.length} team {membersWithoutLocation.length === 1 ? "member" : "members"} will be
              left with no active Location and refused every limited action until you reassign:
            </p>
            <ul className="list-disc pl-5">
              {membersWithoutLocation.map((member) => (
                <li key={member.partyId}>
                  <span className="font-medium">{member.name}</span>{" "}
                  <span className="text-muted-foreground">({member.email})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isPending || location === null} onClick={() => location && onConfirm(location)}>
            {isPending ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
