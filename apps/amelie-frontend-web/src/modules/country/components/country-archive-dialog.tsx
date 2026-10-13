import type { Country } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { countryName } from "#/modules/shared";

type CountryArchiveDialogProps = {
  country: Country | null;
  isPending: boolean;
  onConfirm: (country: Country) => void;
  onCancel: () => void;
};

// -----
// Asks before archiving; open while a Country is
// waiting for the answer. The server refuses a
// Country with open Locations and the last one.
// -----
export function CountryArchiveDialog({ country, isPending, onConfirm, onCancel }: CountryArchiveDialogProps) {
  return (
    <Dialog
      open={country !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {country ? countryName(country.country) : ""}?</DialogTitle>
          <DialogDescription>
            The cafe stops selling there. Its prices are kept, and adding the country again brings them back.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isPending || country === null} onClick={() => country && onConfirm(country)}>
            {isPending ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
