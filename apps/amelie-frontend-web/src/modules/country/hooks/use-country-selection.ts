import { startTransition, useState } from "react";
import { activeCountries, chooseCountry } from "../utils";
import { useSuspenseCountries } from "./use-countries";

// -----
// Which Country a screen shows. With one open Country
// there is nothing to choose: countryId stays
// undefined and the engine uses it. With several, the
// pick defaults to the oldest and falls back if that
// one is archived. Suspends until the Countries load;
// a pick is a transition, so the page keeps showing
// the old Country instead of a skeleton while the new
// one loads.
// -----
export function useSuspenseCountrySelection() {
  const { data } = useSuspenseCountries();
  const active = activeCountries(data);
  const [picked, setPicked] = useState<string | null>(null);

  const selected = chooseCountry(active, picked);

  return {
    countries: active,
    multiple: active.length > 1,
    countryId: selected?.id,
    selected,
    select: (id: string) => startTransition(() => setPicked(id)),
  };
}
