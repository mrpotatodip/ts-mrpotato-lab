import { CURRENCY_VALUES, type CountryValue, type CurrencyValue } from "@repo/contracts/amelie";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { cn } from "#/lib/utils";
import { COUNTRY_OPTIONS, countryName, currencyForCountry } from "../utils/region";

export type RegionValue = { country: CountryValue; currency: CurrencyValue };

type RegionFieldErrors = ReadonlyArray<string | { message: string } | undefined>;

type RegionFieldsErrors = { country?: RegionFieldErrors; currency?: RegionFieldErrors };

type RegionFieldsProps = {
  country: string;
  currency: string;
  onChange: (region: RegionValue) => void;
  disabled?: boolean;
  errors?: RegionFieldsErrors;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
};

export function RegionFields({
  country,
  currency,
  onChange,
  disabled,
  errors,
  className,
  labelClassName,
  triggerClassName,
}: RegionFieldsProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="country" className={labelClassName}>
          Country
        </label>
        <Select
          value={country}
          disabled={disabled}
          onValueChange={(next) => {
            const picked = COUNTRY_OPTIONS.find((option) => option.code === next);
            if (picked) onChange({ country: picked.code, currency: currencyForCountry(picked.code) });
          }}
        >
          <SelectTrigger id="country" aria-label="Country" className={cn("w-full", triggerClassName)}>
            <SelectValue placeholder="Select a country">{country ? countryName(country) : null}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_OPTIONS.map(({ code, name }) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldErrors errors={errors?.country} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className={labelClassName}>
          Currency
        </label>
        <Select
          value={currency}
          disabled={disabled}
          onValueChange={(next) => {
            const picked = CURRENCY_VALUES.find((value) => value === next);
            const pickedCountry = COUNTRY_OPTIONS.find((option) => option.code === country);
            if (picked && pickedCountry) onChange({ country: pickedCountry.code, currency: picked });
          }}
        >
          <SelectTrigger id="currency" aria-label="Currency" className={cn("w-full", triggerClassName)}>
            <SelectValue placeholder="Select a currency">{currency || null}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldErrors errors={errors?.currency} />
      </div>
    </div>
  );
}

type FieldErrorsProps = {
  errors?: RegionFieldErrors;
};

function FieldErrors({ errors }: FieldErrorsProps) {
  return errors?.map((error) => (
    <span key={String(error)} className="text-xs text-destructive">
      {String(error)}
    </span>
  ));
}
