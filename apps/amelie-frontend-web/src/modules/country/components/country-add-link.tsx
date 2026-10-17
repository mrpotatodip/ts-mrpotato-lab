import { useState } from "react";

import { Button } from "#/components/ui/button";
import { PageCard, PowerMark } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useCountries } from "../hooks";
import { CountryAddForm } from "./country-add-form";

// -----
// All a one-country cafe sees: a quiet way to sell in
// another country. Only a role with the create Power sees it;
// it opens the add form in place.
// -----
export function CountryAddLink() {
  const { can } = useActiveTenantRole();
  const { data: countries } = useCountries();
  const [adding, setAdding] = useState(false);

  if (!can("company:profile:countries:create") || !countries) return null;

  if (adding) {
    return (
      <PageCard
        title="Add a country"
        description="Pick the country and the currency its menu is priced in."
        action={<PowerMark power="company:profile:countries:create" />}
      >
        <CountryAddForm countries={countries} onAdded={() => setAdding(false)} onCancel={() => setAdding(false)} />
      </PageCard>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="link" size="sm" className="text-muted-foreground h-auto w-fit px-0" onClick={() => setAdding(true)}>
        Sell in another country? Add a country
      </Button>
      <PowerMark power="company:profile:countries:create" />
    </div>
  );
}
