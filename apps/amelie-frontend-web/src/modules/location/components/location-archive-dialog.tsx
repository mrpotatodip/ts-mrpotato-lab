import type { Location } from "@repo/contracts/amelie";

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
  onConfirm: (location: Location) => void;
  onCancel: () => void;
};

// -----
// Asks before archiving; open while a Location is
// waiting for the answer.
// -----
export function LocationArchiveDialog({ location, isPending, onConfirm, onCancel }: LocationArchiveDialogProps) {
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
