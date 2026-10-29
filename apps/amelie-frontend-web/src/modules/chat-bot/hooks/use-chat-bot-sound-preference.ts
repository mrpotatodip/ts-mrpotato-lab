import { useSyncExternalStore } from "react";

const STORAGE_KEY = "chat-bot-sound";

const listeners = new Set<() => void>();
let remembered = true;

// -----
// localStorage throws under some privacy settings, so the
// choice also lives in memory: it then holds for the
// session even when it cannot be saved.
// -----
function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "on";
  } catch {
    return remembered;
  }
}

function write(muted: boolean): void {
  remembered = muted;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "off" : "on");
  } catch {
    remembered = muted;
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
// Whether this browser has the assistant's step sounds
// muted. Muted by default, and on the server, so the
// first render matches the HTML.
// -----
export function useChatBotSoundPreference() {
  const muted = useSyncExternalStore(subscribe, read, () => true);
  return { muted, setMuted: write };
}
