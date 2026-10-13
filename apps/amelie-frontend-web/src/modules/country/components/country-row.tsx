import { useId } from "react";
import { CURRENCY_VALUES, type Country } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryName } from "#/modules/shared";
import type { CountryCurrencyChange } from "../types";

type CountryRowProps = {
  country: Country;
  openLocations: number;
  canEdit: boolean;
  onChangeCurrency: (change: CountryCurrencyChange) => void;
  onArchive: (country: Country) => void;
  isArchiving: boolean;
};

// -----
// One Country: its name (the code is its identity and
// never changes), its currency, and how many open
// Locations it has. A new currency is only asked for
// here; the section confirms it with a warning.
// -----
export function CountryRow({ country, openLocations, canEdit, onChangeCurrency, onArchive, isArchiving }: CountryRowProps) {
  const id = useId();

  return (
    <li className="flex flex-wrap items-end justify-between gap-3 rounded-md border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{countryName(country.country)}</p>
        <p className="text-muted-foreground text-xs">
          {openLocations === 1 ? "1 open location" : `${openLocations} open locations`}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>Currency</Label>
          <Select
            value={country.currency}
            disabled={!canEdit}
            onValueChange={(next) => {
              const picked = CURRENCY_VALUES.find((value) => value === next);
              if (picked && picked !== country.currency) onChangeCurrency({ country, currency: picked });
            }}
          >
            <SelectTrigger id={id} aria-label="Currency" className="w-32">
              <SelectValue>{country.currency}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canEdit ? (
          <Button type="button" variant="ghost" size="sm" disabled={isArchiving} onClick={() => onArchive(country)}>
            Archive
          </Button>
        ) : null}
      </div>
    </li>
  );
}
