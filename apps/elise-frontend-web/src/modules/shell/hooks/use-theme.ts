import { useCallback, useSyncExternalStore } from "react";
import { SKY_THEMES, THEME_SKIES, skyUrl } from "../constants";

export const THEMES = ["default", "midnight", "daylight", "moonlight"] as const;
export type Theme = (typeof THEMES)[number];

export const isDarkTheme = (theme: Theme) => theme === "midnight" || theme === "moonlight";

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
// It also picks one sky at random for each picture theme on every load
// (data-sky-<theme> is its index in THEME_SKIES, --<theme>-sky its url) and
// preloads them all, so the crossfade in useSkyRotation never waits on a
// download.
// -----
const skyLists = Object.fromEntries(SKY_THEMES.map((name) => [name, THEME_SKIES[name].map(skyUrl)]));

const skyInit = `var L=${JSON.stringify(skyLists)},d=document.documentElement;Object.keys(L).forEach(function(k){var s=L[k],i=Math.floor(Math.random()*s.length);d.setAttribute("data-sky-"+k,String(i));d.style.setProperty("--"+k+"-sky","url("+s[i]+")");s.forEach(function(u){new Image().src=u})});`;

export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="daylight"||t==="moonlight"||t==="midnight")document.documentElement.dataset.theme=t}catch(e){}try{${skyInit}}catch(e){}`;

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
