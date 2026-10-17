import { useSyncExternalStore } from "react";

const STORAGE_KEY = "power-marks";

const listeners = new Set<() => void>();
let remembered = false;

// -----
// localStorage throws under some privacy settings, so the
// choice also lives in memory: it then holds for the
// session even when it cannot be saved.
// -----
function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return remembered;
  }
}

function write(on: boolean): void {
  remembered = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    remembered = on;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// -----
// Whether this browser wants the Power marks shown. Off by
// default, and off on the server, so the first render
// matches the HTML.
// -----
export function usePowerMarksPreference() {
  const on = useSyncExternalStore(subscribe, read, () => false);
  return { on, setOn: write };
}
