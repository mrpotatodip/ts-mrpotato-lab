import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchUnansweredQuestions } from "../api";

export const unansweredQuestionsKeys = {
  all: ["unanswered-questions"] as const,
};

export const unansweredQuestionsQueries = {
  list: () =>
    queryOptions({
      queryKey: unansweredQuestionsKeys.all,
      queryFn: () => fetchUnansweredQuestions(),
      staleTime: 1000 * 30,
    }),
};

export function useUnansweredQuestions() {
  return useQuery(unansweredQuestionsQueries.list());
}

export function useSuspenseUnansweredQuestions() {
  return useSuspenseQuery(unansweredQuestionsQueries.list());
}
