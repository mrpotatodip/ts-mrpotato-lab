import { activeLocations } from "../utils";
import { useLocations } from "./use-locations";

// -----
// The open Locations: archived ones are left out.
// -----
export function useActiveLocations() {
  const { data, isPending, error } = useLocations();
  return { locations: activeLocations(data), isPending, error };
}
