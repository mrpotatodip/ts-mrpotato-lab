import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "elise.sidebar.collapsed";
const CHANGE_EVENT = "elise:sidebar-collapsed";

let fallback = false;

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
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

export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  const toggle = useCallback(() => {
    fallback = !read();
    try {
      localStorage.setItem(STORAGE_KEY, fallback ? "1" : "0");
    } catch {
      return;
    } finally {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  return { collapsed, toggle };
}
