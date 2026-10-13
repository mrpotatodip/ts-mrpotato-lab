import { useId } from "react";
import type { Country } from "@repo/contracts/amelie";

import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryLabel } from "../utils";

type CountrySwitcherProps = {
  countries: Country[];
  value: string | undefined;
  onChange: (countryId: string) => void;
  label?: string;
};

// -----
// Hidden while the cafe sells in one country; several
// let the Person pick which one they are editing.
// -----
export function CountrySwitcher({ countries, value, onChange, label = "Country" }: CountrySwitcherProps) {
  const id = useId();
  if (countries.length < 2) return null;

  const selected = countries.find((country) => country.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(countryId) => {
          if (countryId) onChange(countryId);
        }}
      >
        <SelectTrigger id={id} className="w-64" aria-label={label}>
          <SelectValue>{selected ? countryLabel(selected) : null}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {countries.map((country) => (
            <SelectItem key={country.id} value={country.id}>
              {countryLabel(country)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
