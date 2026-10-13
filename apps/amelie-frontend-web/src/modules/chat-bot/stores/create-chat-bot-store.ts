export type ChatBotStore<T> = {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
};

// -----
// Module-level state for useSyncExternalStore;
// init runs on the first read.
// -----
export function createChatBotStore<T>(init: () => T): ChatBotStore<T> {
  let value: { current: T } | null = null;
  const listeners = new Set<() => void>();

  const get = (): T => {
    value ??= { current: init() };
    return value.current;
  };

  return {
    get,
    set: (next) => {
      if (Object.is(next, get())) return;
      value = { current: next };
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
