import { startTransition, useState } from "react";
import { activeLocations, chooseLocation } from "../utils";
import { useSuspenseLocations } from "./use-locations";

// -----
// Which Location a screen is editing. With one
// active Location there is nothing to choose:
// locationId stays undefined and the engine uses
// it. With several, the pick defaults to the
// oldest and falls back if that one is archived.
// Suspends until the Locations load; a pick is a
// transition, so the page keeps the old Location
// instead of a skeleton while the new one loads.
// -----
export function useSuspenseLocationSelection() {
  const { data } = useSuspenseLocations();
  const active = activeLocations(data);
  const [picked, setPicked] = useState<string | null>(null);

  const selected = chooseLocation(active, picked);

  return {
    locations: active,
    multiple: active.length > 1,
    locationId: selected?.id,
    selected,
    select: (id: string) => startTransition(() => setPicked(id)),
  };
}
