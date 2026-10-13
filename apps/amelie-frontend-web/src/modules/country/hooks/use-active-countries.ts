import { activeCountries } from "../utils";
import { useCountries } from "./use-countries";

// -----
// The open Countries: archived ones are left out.
// -----
export function useActiveCountries() {
  const { data, isPending, error } = useCountries();
  return { countries: activeCountries(data), isPending, error };
}
