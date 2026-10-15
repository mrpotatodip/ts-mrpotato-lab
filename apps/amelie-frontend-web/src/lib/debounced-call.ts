export type DebouncedCall<T> = {
  schedule: (value: T) => void;
  flush: () => void;
  cancel: () => void;
  hasPending: () => boolean;
};

export function createDebouncedCall<T>(delayMs: number, send: (value: T) => void): DebouncedCall<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { value: T } | undefined;

  const fire = () => {
    timer = undefined;
    const next = pending;
    pending = undefined;
    if (next) send(next.value);
  };

  return {
    schedule(value) {
      pending = { value };
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(fire, delayMs);
    },
    flush() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      fire();
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      pending = undefined;
    },
    hasPending() {
      return pending !== undefined;
    },
  };
}
