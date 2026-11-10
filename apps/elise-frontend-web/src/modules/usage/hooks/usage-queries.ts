import { queryOptions } from "@tanstack/react-query";
import { fetchBudgetChanges, fetchUsage } from "../api";

export const usageKeys = {
  all: ["usage"] as const,
  month: () => [...usageKeys.all, "month"] as const,
  changes: () => [...usageKeys.all, "changes"] as const,
};

export const budgetChangesQuery = () =>
  queryOptions({
    queryKey: usageKeys.changes(),
    queryFn: () => fetchBudgetChanges(),
  });

export const usageQuery = () =>
  queryOptions({
    queryKey: usageKeys.month(),
    queryFn: () => fetchUsage(),
    refetchInterval: 30_000,
  });
