import { useForm } from "@tanstack/react-form";
import { CURRENCY_VALUES, CreateCountryBodySchema, type Country } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { countryName, currencyForCountry } from "#/modules/shared";
import { useCountryActions } from "../hooks";
import type { CountryAddFormValues } from "../schemas";
import { addableCountryOptions } from "../utils";

type CountryAddFormProps = {
  countries: Country[];
  onAdded?: () => void;
  onCancel?: () => void;
};

const EMPTY_VALUES: CountryAddFormValues = { country: "", currency: "" };

// -----
// Picks a country; its usual currency is filled in and
// can be changed. A country the cafe archived before
// is offered too: adding it brings its prices back.
// -----
export function CountryAddForm({ countries, onAdded, onCancel }: CountryAddFormProps) {
  const { createCountry } = useCountryActions();
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
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-wrap gap-2">
        <form.Field name="country">
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(next) => {
                const picked = options.find((option) => option.code === next);
                if (!picked) return;
                field.handleChange(picked.code);
                form.setFieldValue("currency", currencyForCountry(picked.code));
              }}
            >
              <SelectTrigger aria-label="Country" className="w-fit min-w-40">
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
          )}
        </form.Field>
        <form.Field name="currency">
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(next) => {
                const picked = CURRENCY_VALUES.find((value) => value === next);
                if (picked) field.handleChange(picked);
              }}
            >
              <SelectTrigger aria-label="Currency" className="w-fit min-w-40">
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
          )}
        </form.Field>
      </div>
      {createCountry.isError ? <p className="text-xs text-destructive">{createCountry.error.message}</p> : null}
      <div className="mt-3 flex gap-2">
        <form.Subscribe selector={(state) => state.values.country === "" || state.values.currency === ""}>
          {(incomplete) => (
            <Button type="submit" size="sm" disabled={incomplete || createCountry.isPending}>
              {createCountry.isPending ? "Adding..." : "Add country"}
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
