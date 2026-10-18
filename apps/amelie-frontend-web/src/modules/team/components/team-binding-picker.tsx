import type { Country, Location } from "@repo/contracts/amelie";

import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import { cn } from "#/lib/utils";
import { countryName } from "#/modules/shared";
import { isBound, toggleBinding, type TeamAccess } from "../utils";

type TeamBindingPickerProps = {
  value: TeamAccess;
  onChange: (next: TeamAccess) => void;
  countries: Country[];
  locations: Location[];
};

const CHOICES = [
  { mode: "whole", title: "Whole cafe", hint: "Every Country and Location, including new ones." },
  { mode: "bound", title: "Only some", hint: "Pick Countries or Locations below." },
] as const;

// -----
// Where a Role applies: two cards and, for "Only some",
// a checklist. No default: nothing is chosen until the
// admin picks a card. A Country row covers its Locations,
// including ones opened later, so ticking it ticks and
// locks them.
// -----
export function TeamBindingPicker({ value, onChange, countries, locations }: TeamBindingPickerProps) {
  const bindings = value?.mode === "bound" ? value.bindings : [];
  const openCountries = countries.filter((country) => country.archivedAt === null);

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Where this Role applies</legend>
        {CHOICES.map((choice) => {
          const selected = value?.mode === choice.mode;
          return (
            <button
              key={choice.mode}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (choice.mode === "whole") onChange({ mode: "whole" });
                else if (value?.mode !== "bound") onChange({ mode: "bound", bindings: [] });
              }}
              className={cn(
                "flex flex-col gap-0.5 rounded-2xl border p-3 text-left text-sm transition-colors",
                selected ? "border-primary bg-accent/50" : "hover:bg-accent/40",
              )}
            >
              <span className="font-medium">{choice.title}</span>
              <span className="stat-label">{choice.hint}</span>
            </button>
          );
        })}
      </fieldset>
      {value === null ? <p className="stat-label">Choose one. There is no default.</p> : null}
      {value?.mode === "bound" ? (
        <div className="flex flex-col gap-1 rounded-2xl border p-3">
          {openCountries.map((country) => {
            const countryOn = isBound(bindings, "country", country.id);
            const inCountry = locations.filter(
              (location) => location.countryId === country.id && location.archivedAt === null,
            );
            return (
              <div key={country.id} className="flex flex-col gap-1 py-1.5">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={countryOn}
                    onCheckedChange={() =>
                      onChange({
                        mode: "bound",
                        bindings: toggleBinding(bindings, { kind: "country", id: country.id }, locations),
                      })
                    }
                  />
                  All of {countryName(country.country)}
                  <span className="stat-label font-normal">(includes new Locations)</span>
                </Label>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
                  {inCountry.map((location) => (
                    <Label key={location.id} className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={countryOn || isBound(bindings, "location", location.id)}
                        disabled={countryOn}
                        onCheckedChange={() =>
                          onChange({
                            mode: "bound",
                            bindings: toggleBinding(bindings, { kind: "location", id: location.id }, locations),
                          })
                        }
                      />
                      {location.name}
                    </Label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
