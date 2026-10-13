import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

// -----
// Matches each theme's --background token, so
// the browser chrome meets the page seamlessly.
// -----
const THEME_COLOR = { light: "#fbfaf9", dark: "#110f0e" } as const;

export type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "auto"];

function isThemeMode(value: string | null): value is ThemeMode {
  return THEME_MODES.some((mode) => mode === value);
}

// -----
// localStorage throws rather than returning null under
// some privacy settings. Light is the default.
// -----
function readThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

// -----
// A theme preference is never worth an exception, so a
// blocked write just means it won't outlive the session.
// -----
function writeThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // no-op
  }
}

function systemThemeQuery(): MediaQueryList {
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode !== "auto") return mode;
  return systemThemeQuery().matches ? "dark" : "light";
}

// -----
// Mirrors THEME_INIT_SCRIPT in __root.tsx by hand — that
// script ships as an inline string and cannot import this.
// -----
function applyThemeMode(mode: ThemeMode): void {
  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  root.style.colorScheme = resolved;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[resolved]);
}

const listeners = new Set<() => void>();

// -----
// Server-side this takes readThemeMode's catch, landing
// on the same "light" a first-time visitor gets.
// -----
let themeMode: ThemeMode = readThemeMode();

function emit(): void {
  for (const listener of listeners) listener();
}

// -----
// Auto has to keep following the OS while the app is open;
// resolving once at load would go stale at sunset.
// -----
let unwatchSystemTheme: (() => void) | null = null;

function watchSystemTheme(): () => void {
  const query = systemThemeQuery();
  const onChange = () => {
    if (themeMode === "auto") applyThemeMode("auto");
  };

  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) unwatchSystemTheme = watchSystemTheme();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unwatchSystemTheme?.();
      unwatchSystemTheme = null;
    }
  };
}

// -----
// The theme lives in localStorage, not React state: the
// blocking script must apply it long before hydration.
// -----
export function useTheme() {
  const mode = useSyncExternalStore(
    subscribe,
    () => themeMode,
    (): ThemeMode => "light",
  );

  const setMode = useCallback((next: ThemeMode) => {
    themeMode = next;
    writeThemeMode(next);
    applyThemeMode(next);
    emit();
  }, []);

  return { mode, setMode };
}
