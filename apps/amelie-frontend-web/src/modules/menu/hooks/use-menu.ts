import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchMenu } from "../api";

// -----
// One menu per Country: a cafe with one reads the
// "only" menu, several read the picked Country's.
// Reloading by menuKeys.all reloads them all.
// -----
export const menuKeys = {
  all: ["menu"] as const,
  editor: (countryId: string | undefined) => [...menuKeys.all, countryId ?? "only"] as const,
};

export const menuQueries = {
  editor: (countryId?: string) =>
    queryOptions({
      queryKey: menuKeys.editor(countryId),
      queryFn: () => fetchMenu({ data: { countryId } }),
      staleTime: 1000 * 30,
    }),
};

export function useMenu(countryId?: string, enabled = true) {
  return useQuery({ ...menuQueries.editor(countryId), enabled });
}

export function useSuspenseMenu(countryId?: string) {
  return useSuspenseQuery(menuQueries.editor(countryId));
}
