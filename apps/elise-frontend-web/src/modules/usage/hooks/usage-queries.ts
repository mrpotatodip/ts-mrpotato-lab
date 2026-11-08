import { queryOptions } from "@tanstack/react-query";
import { fetchUsage } from "../api";

export const usageKeys = {
  all: ["usage"] as const,
  month: () => [...usageKeys.all, "month"] as const,
};

export const usageQuery = () =>
  queryOptions({
    queryKey: usageKeys.month(),
    queryFn: () => fetchUsage(),
    refetchInterval: 30_000,
  });
