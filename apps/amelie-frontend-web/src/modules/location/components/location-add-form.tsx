import { useId } from "react";
import { useForm } from "@tanstack/react-form";
import { CreateLocationBodySchema, LOCATION_NAME_MAX } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryLabel, useActiveCountries } from "#/modules/country";
import { useLocationActions } from "../hooks";
import type { LocationAddFormValues } from "../schemas";
import { needsCountryChoice, toLocationCreateBody } from "../utils";

type LocationAddFormProps = {
  onAdded?: () => void;
};

const EMPTY_VALUES: LocationAddFormValues = { name: "", countryId: "" };

// -----
// A new Location starts with a name, and the Country
// it is in when the cafe sells in several (fixed after
// it is added). Its timezone starts from the last
// Location in that Country, else the cafe's.
// -----
export function LocationAddForm({ onAdded }: LocationAddFormProps) {
  const { createLocation } = useLocationActions();
  const { countries } = useActiveCountries();
  const countryFieldId = useId();
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
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <Input
            aria-label="New location"
            placeholder="Location name, e.g. Airport"
            className="w-64"
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={countryFieldId}>Country</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(countryId) => {
                    if (countryId) field.handleChange(countryId);
                  }}
                >
                  <SelectTrigger id={countryFieldId} aria-label="Country" className="w-64">
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
              </div>
            );
          }}
        </form.Field>
      ) : null}
      <form.Subscribe selector={(state) => state.values.name.trim() === "" || (choosesCountry && state.values.countryId === "")}>
        {(incomplete) => (
          <Button type="submit" size="sm" disabled={incomplete || createLocation.isPending}>
            {createLocation.isPending ? "Adding..." : "Add location"}
          </Button>
        )}
      </form.Subscribe>
      {createLocation.isError ? <span className="text-xs text-destructive">{createLocation.error.message}</span> : null}
    </form>
  );
}
