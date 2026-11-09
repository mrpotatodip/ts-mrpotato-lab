import { useCallback, useSyncExternalStore } from "react";

export const THEMES = ["default", "daylight", "moonlight"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "elise.theme";
const CHANGE_EVENT = "elise:theme";

let fallback: Theme = "default";

const isTheme = (value: string | null): value is Theme => THEMES.some((theme) => theme === value);

const read = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "default";
  } catch {
    return fallback;
  }
};

const readOnServer = (): Theme => "default";

const subscribe =(onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

// -----
// Runs in <head> before first paint, so a saved theme never flashes the
// default. Keep it in step with `read` above. Default sets no attribute.
// -----
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="daylight"||t==="moonlight")document.documentElement.dataset.theme=t}catch(e){}`;

const apply = (theme: Theme) => {
  if (theme === "default") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, readOnServer);

  const setTheme = useCallback((next: Theme) => {
    fallback = next;
    apply(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      return;
    } finally {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  return { theme, setTheme };
}
