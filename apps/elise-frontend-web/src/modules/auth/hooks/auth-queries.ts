import { queryOptions } from "@tanstack/react-query";
import { fetchSession } from "../api";

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
};

// -----
// The root route reads the session on every navigation. Cached for a minute, a
// client-side click no longer waits on a server round trip. Sign-in and
// sign-out reset it, and every server function still checks the cookie itself.
// -----
export const sessionQuery = () =>
  queryOptions({
    queryKey: authKeys.session(),
    queryFn: () => fetchSession(),
    staleTime: 60_000,
  });
