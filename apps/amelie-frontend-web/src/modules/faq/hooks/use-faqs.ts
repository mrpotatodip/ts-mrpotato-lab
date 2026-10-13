import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchFaqs } from "../api";

export const faqsKeys = {
  all: ["faqs"] as const,
};

export const faqsQueries = {
  list: () =>
    queryOptions({
      queryKey: faqsKeys.all,
      queryFn: () => fetchFaqs(),
      staleTime: 1000 * 30,
    }),
};

export function useFaqs() {
  return useQuery(faqsQueries.list());
}

export function useSuspenseFaqs() {
  return useSuspenseQuery(faqsQueries.list());
}
