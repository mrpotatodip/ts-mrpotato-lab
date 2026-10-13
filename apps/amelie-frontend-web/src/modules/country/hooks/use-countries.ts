import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchCountries } from "../api";

export const countriesKeys = {
  all: ["countries"] as const,
};

export const countriesQueries = {
  list: () =>
    queryOptions({
      queryKey: countriesKeys.all,
      queryFn: () => fetchCountries(),
      staleTime: 1000 * 30,
    }),
};

export function useCountries() {
  return useQuery(countriesQueries.list());
}

export function useSuspenseCountries() {
  return useSuspenseQuery(countriesQueries.list());
}
