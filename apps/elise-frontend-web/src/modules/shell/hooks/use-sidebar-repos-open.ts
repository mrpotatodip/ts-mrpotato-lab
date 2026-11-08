import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "elise.sidebar.repos";
const CHANGE_EVENT = "elise:sidebar-repos";

let fallback = true;

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return fallback;
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

export function useSidebarReposOpen() {
  const open = useSyncExternalStore(subscribe, read, () => true);

  const setOpen = useCallback((next: boolean) => {
    fallback = next;
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      return;
    } finally {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  return { open, setOpen };
}
