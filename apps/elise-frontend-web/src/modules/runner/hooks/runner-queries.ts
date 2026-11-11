import { queryOptions } from "@tanstack/react-query";
import { fetchRunners } from "../api";
import { RUNNER_WAITING_POLL_MS } from "../constants";

export const runnerKeys = {
  all: ["runners"] as const,
  list: () => [...runnerKeys.all, "list"] as const,
};

// -----
// While a pairing code is waiting, the list asks again every few
// seconds, so the row turns to Connected as soon as the app pairs.
// With nothing waiting it does not poll.
// -----
export const runnersQuery = () =>
  queryOptions({
    queryKey: runnerKeys.list(),
    queryFn: () => fetchRunners(),
    refetchInterval: (query) => (query.state.data?.some((runner) => runner.state === "waiting") ? RUNNER_WAITING_POLL_MS : false),
  });
