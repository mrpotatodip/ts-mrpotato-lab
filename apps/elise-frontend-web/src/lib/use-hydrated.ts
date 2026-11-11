import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export const hydratedTimeZone = (hydrated: boolean) => (hydrated ? undefined : "UTC");

const NARROW_QUERY = "(max-width: 1023px)";

const subscribeNarrow = (onChange: () => void) => {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export const useNarrow = () =>
  useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
