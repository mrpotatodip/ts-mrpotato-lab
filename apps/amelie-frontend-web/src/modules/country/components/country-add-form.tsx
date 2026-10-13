import { useId } from "react";
import { useForm } from "@tanstack/react-form";
import { CURRENCY_VALUES, CreateCountryBodySchema, type Country } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryName, currencyForCountry } from "#/modules/shared";
import { useCountryActions } from "../hooks";
import type { CountryAddFormValues } from "../schemas";
import { addableCountryOptions } from "../utils";

type CountryAddFormProps = {
  countries: Country[];
  onAdded?: () => void;
};

const EMPTY_VALUES: CountryAddFormValues = { country: "", currency: "" };

// -----
// Picks a country; its usual currency is filled in and
// can be changed. A country the cafe archived before
// is offered too: adding it brings its prices back.
// -----
export function CountryAddForm({ countries, onAdded }: CountryAddFormProps) {
  const { createCountry } = useCountryActions();
  const countryId = useId();
  const currencyId = useId();
  const options = addableCountryOptions(countries);

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    validators: {
      onChange: ({ value }) => {
        const result = CreateCountryBodySchema.safeParse(value);
        return result.success ? undefined : "Choose a country and a currency";
      },
    },
    onSubmit: ({ value }) =>
      createCountry.mutate(
        { data: CreateCountryBodySchema.parse(value) },
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
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="country">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={countryId}>Country</Label>
            <Select
              value={field.state.value}
              onValueChange={(next) => {
                const picked = options.find((option) => option.code === next);
                if (!picked) return;
                field.handleChange(picked.code);
                form.setFieldValue("currency", currencyForCountry(picked.code));
              }}
            >
              <SelectTrigger id={countryId} aria-label="Country" className="w-64">
                <SelectValue placeholder="Select a country">{field.state.value ? countryName(field.state.value) : null}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map(({ code, name }) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>
      <form.Field name="currency">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={currencyId}>Currency</Label>
            <Select
              value={field.state.value}
              onValueChange={(next) => {
                const picked = CURRENCY_VALUES.find((value) => value === next);
                if (picked) field.handleChange(picked);
              }}
            >
              <SelectTrigger id={currencyId} aria-label="Currency" className="w-32">
                <SelectValue placeholder="Currency">{field.state.value || null}</SelectValue>
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
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.country === "" || state.values.currency === ""}>
        {(incomplete) => (
          <Button type="submit" size="sm" disabled={incomplete || createCountry.isPending}>
            {createCountry.isPending ? "Adding..." : "Add country"}
          </Button>
        )}
      </form.Subscribe>
      {createCountry.isError ? <span className="text-xs text-destructive">{createCountry.error.message}</span> : null}
    </form>
  );
}
