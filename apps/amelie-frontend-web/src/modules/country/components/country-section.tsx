import { useState } from "react";
import type { Country } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { PageCard, PowerMark } from "#/modules/shared";
import { useAllLocations } from "#/modules/location";
import { useActiveTenantRole } from "#/modules/tenant";
import { useActiveCountries, useCountries, useCountryActions } from "../hooks";
import type { CountryCurrencyChange } from "../types";
import { countOpenLocationsIn } from "../utils";
import { CountryAddForm } from "./country-add-form";
import { CountryArchiveDialog } from "./country-archive-dialog";
import { CountryCurrencyDialog } from "./country-currency-dialog";
import { CountryRow } from "./country-row";

// -----
// The Countries settings, for a cafe that sells in two
// or more: edit a currency (with a warning), archive,
// or add another. It replaces the Region card, which
// can only describe one country. A refused archive (the
// Country has open Locations, or it is the last one)
// shows the server's reason and stays until the next try.
// -----
export function CountrySection() {
  const { countries: active } = useActiveCountries();
  const { data: all } = useCountries();
  // The unfiltered list: Country management is open to a bound member, and
  // a Country with a Location they do not cover still cannot be archived.
  const { data: locations } = useAllLocations();
  const { can } = useActiveTenantRole();
  const canCreate = can("company:profile:countries:create");
  const canChangeCurrency = can("company:profile:countries:update");
  const canArchive = can("company:profile:countries:archive");
  const { archiveCountry, updateCountry } = useCountryActions();
  const [archiving, setArchiving] = useState<Country | null>(null);
  const [changing, setChanging] = useState<CountryCurrencyChange | null>(null);
  const [adding, setAdding] = useState(false);

  if (active.length < 2) return null;

  return (
    <PageCard
      title="Countries"
      description="Each country has its own currency, prices and locations."
      contentClassName="p-0"
      action={<PowerMark power="company:profile:countries:read" />}
    >
      <ul className="divide-y">
        {active.map((country) => (
          <CountryRow
            key={country.id}
            country={country}
            openLocations={countOpenLocationsIn(locations, country.id)}
            canChangeCurrency={canChangeCurrency}
            canArchive={canArchive}
            onChangeCurrency={(change) => {
              updateCountry.reset();
              setChanging(change);
            }}
            onArchive={(target) => {
              archiveCountry.reset();
              setArchiving(target);
            }}
            isArchiving={archiveCountry.isPending}
          />
        ))}
      </ul>
      {archiveCountry.isError ? <p role="alert" className="px-6 pt-4 text-xs text-destructive">{archiveCountry.error.message}</p> : null}
      {canCreate ? (
        <div className="border-t p-6">
          {adding ? (
            <CountryAddForm countries={all ?? active} onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <div className="flex items-center gap-2">
              <PowerMark power="company:profile:countries:create" />
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
                Add country
              </Button>
            </div>
          )}
        </div>
      ) : canChangeCurrency || canArchive ? null : (
        <p className="text-muted-foreground p-6 text-sm">Your role cannot change this.</p>
      )}
      <CountryCurrencyDialog
        change={changing}
        isPending={updateCountry.isPending}
        error={updateCountry.isError ? updateCountry.error.message : null}
        onCancel={() => setChanging(null)}
        onConfirm={(change) =>
          updateCountry.mutate(
            { data: { countryId: change.country.id, currency: change.currency } },
            { onSuccess: () => setChanging(null) },
          )
        }
      />
      <CountryArchiveDialog
        country={archiving}
        isPending={archiveCountry.isPending}
        onCancel={() => setArchiving(null)}
        onConfirm={(country) => {
          setArchiving(null);
          archiveCountry.mutate({ data: { countryId: country.id } });
        }}
      />
    </PageCard>
  );
}
