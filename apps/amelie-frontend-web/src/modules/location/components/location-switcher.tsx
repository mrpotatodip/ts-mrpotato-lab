import { useId } from "react";
import type { Location } from "@repo/contracts/amelie";

import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";

type LocationSwitcherProps = {
  locations: Location[];
  value: string | undefined;
  onChange: (locationId: string) => void;
  label?: string;
};

// -----
// Hidden while the cafe has one Location; several
// let the Person pick which one they are editing.
// -----
export function LocationSwitcher({ locations, value, onChange, label = "Location" }: LocationSwitcherProps) {
  const id = useId();
  if (locations.length < 2) return null;

  const selected = locations.find((location) => location.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(locationId) => {
          if (locationId) onChange(locationId);
        }}
      >
        <SelectTrigger id={id} className="w-64" aria-label={label}>
          <SelectValue>{selected?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
