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
import type { CountryCurrencyChange } from "../types";

type CountryCurrencyDialogProps = {
  change: CountryCurrencyChange | null;
  isPending: boolean;
  error: string | null;
  onConfirm: (change: CountryCurrencyChange) => void;
  onCancel: () => void;
};

const name = (country: Country | undefined): string => (country ? countryName(country.country) : "");

// -----
// Warns before a currency change: nothing is
// converted, so a saved price keeps its number.
// -----
export function CountryCurrencyDialog({ change, isPending, error, onConfirm, onCancel }: CountryCurrencyDialogProps) {
  return (
    <Dialog
      open={change !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Change {name(change?.country)}&apos;s currency to {change?.currency}?
          </DialogTitle>
          <DialogDescription>
            Prices are relabeled, not converted. A price of 4.75 {change?.country.currency} becomes 4.75 {change?.currency}.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending || change === null} onClick={() => change && onConfirm(change)}>
            {isPending ? "Saving..." : "Change currency"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
