// -----
// The sky of each picture theme: every picture, and how the rotation behaves.
// This is the one place to edit. To add a sky, drop the file in
// public/theme-bgs and add its name to that theme's list; the random pick, the
// preload and the crossfade all read these lists. useSkyRotation
// (hooks/use-sky-rotation.ts) runs them.
// -----

export const THEME_SKIES = {
  daylight: ["bg-daylight-1.jpeg", "bg-daylight-2.jpeg", "bg-daylight-3.jpeg"],
  moonlight: ["bg-moonlight-1.jpeg", "bg-moonlight-2.jpeg", "bg-moonlight-3.jpeg"],
} as const;

export type SkyTheme = keyof typeof THEME_SKIES;

export const SKY_THEMES = Object.keys(THEME_SKIES).filter((name): name is SkyTheme => name in THEME_SKIES);

export const SKY_DIR = "/theme-bgs/";

// -----
// How long one sky stays on screen before the next fades in.
// -----
export const SKY_HOLD_MS = 16_000;

// -----
// How long the crossfade between two skies takes.
// -----
export const SKY_FADE_MS = 4_000;

// -----
// The rotation runs only after this long without any input.
// -----
export const SKY_IDLE_MS = 10_000;

export const skyUrl = (file: string) => `${SKY_DIR}${file}`;

export const isSkyTheme = (theme: string): theme is SkyTheme => theme in THEME_SKIES;
