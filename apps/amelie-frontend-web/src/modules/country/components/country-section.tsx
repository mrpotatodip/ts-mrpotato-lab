import { useState } from "react";
import type { Country } from "@repo/contracts/amelie";

import { PageCard } from "#/modules/shared";
import { useLocations } from "#/modules/location";
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
  const { data: locations } = useLocations();
  const { canEdit } = useActiveTenantRole();
  const { archiveCountry, updateCountry } = useCountryActions();
  const [archiving, setArchiving] = useState<Country | null>(null);
  const [changing, setChanging] = useState<CountryCurrencyChange | null>(null);

  if (active.length < 2) return null;

  return (
    <PageCard title="Countries" description="Each country has its own currency, prices and locations.">
      <div className="space-y-4">
        <ul className="space-y-3">
          {active.map((country) => (
            <CountryRow
              key={country.id}
              country={country}
              openLocations={countOpenLocationsIn(locations, country.id)}
              canEdit={canEdit}
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
        {archiveCountry.isError ? <p role="alert" className="text-xs text-destructive">{archiveCountry.error.message}</p> : null}
        {canEdit ? <CountryAddForm countries={all ?? active} /> : <p className="text-muted-foreground text-xs">Only an owner or manager can change this.</p>}
      </div>
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
