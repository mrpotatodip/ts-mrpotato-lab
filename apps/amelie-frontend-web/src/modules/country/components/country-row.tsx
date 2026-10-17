import { CURRENCY_VALUES, type Country } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryName, PowerMark } from "#/modules/shared";
import type { CountryCurrencyChange } from "../types";

type CountryRowProps = {
  country: Country;
  openLocations: number;
  canChangeCurrency: boolean;
  canArchive: boolean;
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
export function CountryRow({
  country,
  openLocations,
  canChangeCurrency,
  canArchive,
  onChangeCurrency,
  onArchive,
  isArchiving,
}: CountryRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 p-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{countryName(country.country)}</p>
        <p className="text-muted-foreground text-sm">
          {openLocations === 1 ? "1 open location" : `${openLocations} open locations`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canChangeCurrency ? <PowerMark power="company:profile:countries:update" /> : null}
        <Select
          value={country.currency}
          disabled={!canChangeCurrency}
          onValueChange={(next) => {
            const picked = CURRENCY_VALUES.find((value) => value === next);
            if (picked && picked !== country.currency) onChangeCurrency({ country, currency: picked });
          }}
        >
          <SelectTrigger aria-label="Currency" className="w-fit min-w-40">
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
        {canArchive ? (
          <>
            <PowerMark power="company:profile:countries:archive" />
            <Button type="button" variant="ghost" size="sm" disabled={isArchiving} onClick={() => onArchive(country)}>
              Archive
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}
