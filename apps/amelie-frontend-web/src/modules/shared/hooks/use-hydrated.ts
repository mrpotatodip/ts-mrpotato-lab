import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// -----
// False on the server and during hydration, true after.
// Use it for output that depends on the viewer's zone
// or locale, so the first browser render matches the
// server's HTML.
// -----
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
