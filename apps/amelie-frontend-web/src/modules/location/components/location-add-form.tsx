import { useForm } from "@tanstack/react-form";
import { CreateLocationBodySchema, LOCATION_NAME_MAX } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryLabel, useActiveCountries } from "#/modules/country";
import { useLocationActions } from "../hooks";
import type { LocationAddFormValues } from "../schemas";
import { needsCountryChoice, toLocationCreateBody } from "../utils";

type LocationAddFormProps = {
  onAdded?: () => void;
  onCancel?: () => void;
};

const EMPTY_VALUES: LocationAddFormValues = { name: "", countryId: "" };

// -----
// A new Location starts with a name, and the Country
// it is in when the cafe sells in several (fixed after
// it is added). Its timezone starts from the last
// Location in that Country, else the cafe's.
// -----
export function LocationAddForm({ onAdded, onCancel }: LocationAddFormProps) {
  const { createLocation } = useLocationActions();
  const { countries } = useActiveCountries();
  const choosesCountry = needsCountryChoice(countries);

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    validators: {
      onChange: ({ value }) => {
        const result = CreateLocationBodySchema.safeParse(toLocationCreateBody(value.name, value.countryId, countries));
        if (result.success) return undefined;
        return result.error.issues.map((issue) => issue.message).join(", ");
      },
    },
    onSubmit: ({ value }) =>
      createLocation.mutate(
        { data: CreateLocationBodySchema.parse(toLocationCreateBody(value.name, value.countryId, countries)) },
        {
          onSuccess: () => {
            form.reset();
            onAdded?.();
          },
        },
      ),
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-wrap gap-2">
        <form.Field name="name">
          {(field) => (
            <Input
              aria-label="New location"
              placeholder="Location name, e.g. Airport"
              className="w-56"
              maxLength={LOCATION_NAME_MAX}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
        {choosesCountry ? (
          <form.Field name="countryId">
            {(field) => {
              const chosen = countries.find((country) => country.id === field.state.value);
              return (
                <Select
                  value={field.state.value}
                  onValueChange={(countryId) => {
                    if (countryId) field.handleChange(countryId);
                  }}
                >
                  <SelectTrigger aria-label="Country" className="w-fit min-w-40">
                    <SelectValue placeholder="Which country?">{chosen ? countryLabel(chosen) : null}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {countryLabel(country)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          </form.Field>
        ) : null}
      </div>
      {createLocation.isError ? <p className="text-xs text-destructive">{createLocation.error.message}</p> : null}
      <div className="mt-3 flex gap-2">
        <form.Subscribe selector={(state) => state.values.name.trim() === "" || (choosesCountry && state.values.countryId === "")}>
          {(incomplete) => (
            <Button type="submit" size="sm" disabled={incomplete || createLocation.isPending}>
              {createLocation.isPending ? "Adding..." : "Add location"}
            </Button>
          )}
        </form.Subscribe>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
