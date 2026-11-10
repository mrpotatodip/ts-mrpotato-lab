import { queryOptions } from "@tanstack/react-query";
import { fetchAnthropicKey, fetchSettingsChanges, fetchUsage } from "../api";

export const usageKeys = {
  all: ["usage"] as const,
  month: () => [...usageKeys.all, "month"] as const,
  changes: () => [...usageKeys.all, "changes"] as const,
  anthropicKey: () => [...usageKeys.all, "anthropic-key"] as const,
};

export const anthropicKeyQuery = () =>
  queryOptions({
    queryKey: usageKeys.anthropicKey(),
    queryFn: () => fetchAnthropicKey(),
  });

export const settingsChangesQuery = () =>
  queryOptions({
    queryKey: usageKeys.changes(),
    queryFn: () => fetchSettingsChanges(),
  });

export const usageQuery = () =>
  queryOptions({
    queryKey: usageKeys.month(),
    queryFn: () => fetchUsage(),
    refetchInterval: 30_000,
  });
