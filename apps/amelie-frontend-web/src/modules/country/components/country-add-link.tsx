import { useState } from "react";

import { Button } from "#/components/ui/button";
import { PageCard } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useCountries } from "../hooks";
import { CountryAddForm } from "./country-add-form";

// -----
// All a one-country cafe sees: a quiet way to sell in
// another country. Only an owner or manager sees it;
// it opens the add form in place.
// -----
export function CountryAddLink() {
  const { canEdit } = useActiveTenantRole();
  const { data: countries } = useCountries();
  const [adding, setAdding] = useState(false);

  if (!canEdit || !countries) return null;

  if (adding) {
    return (
      <PageCard title="Add a country" description="Pick the country and the currency its menu is priced in.">
        <div className="space-y-3">
          <CountryAddForm countries={countries} onAdded={() => setAdding(false)} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      </PageCard>
    );
  }

  return (
    <Button variant="link" size="sm" className="text-muted-foreground h-auto w-fit px-0" onClick={() => setAdding(true)}>
      Sell in another country? Add a country
    </Button>
  );
}
