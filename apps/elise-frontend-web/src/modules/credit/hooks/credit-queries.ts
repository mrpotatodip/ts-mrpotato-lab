import { queryOptions } from "@tanstack/react-query";
import { fetchCredit } from "../api";

export const creditKeys = {
  all: ["credit"] as const,
  balance: () => [...creditKeys.all, "balance"] as const,
};

export const creditQuery = () =>
  queryOptions({
    queryKey: creditKeys.balance(),
    queryFn: () => fetchCredit(),
    refetchInterval: 30_000,
  });
