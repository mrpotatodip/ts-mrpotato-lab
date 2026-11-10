import { useEffect } from "react";
import { SKY_FADE_MS, SKY_HOLD_MS, SKY_IDLE_MS, THEME_SKIES, isSkyTheme, skyUrl } from "../constants";
import { skyKeyframes, skyStartTime } from "../utils";
import { useTheme } from "./use-theme";

const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "scroll", "touchstart"] as const;

// -----
// Crossfades the sky of a picture theme (Daylight, Moonlight) through that
// theme's list in THEME_SKIES, but only while the page is idle: it starts after
// SKY_IDLE_MS without input and pauses, wherever it is, on the next input. The
// animation runs on the page's ::before (the sky layer), starting on the sky
// themeInitScript picked (data-sky-<theme>, an index).
//
// To debug it: <html data-sky-state> reads "playing" or "paused", and
// document.getAnimations() lists the loop, with its currentTime.
// -----
export function useSkyRotation() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isSkyTheme(theme)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const urls = THEME_SKIES[theme].map(skyUrl);
    const picked = Number(root.getAttribute(`data-sky-${theme}`));
    const index = Number.isInteger(picked) && picked >= 0 && picked < urls.length ? picked : 0;

    const loop = root.animate(skyKeyframes(urls, SKY_HOLD_MS, SKY_FADE_MS), {
      duration: (SKY_HOLD_MS + SKY_FADE_MS) * urls.length,
      iterations: Infinity,
      pseudoElement: "::before",
    });
    loop.currentTime = skyStartTime(index, SKY_HOLD_MS, SKY_FADE_MS);

    const setState = (playing: boolean) => {
      if (playing) loop.play();
      else loop.pause();
      root.dataset.skyState = playing ? "playing" : "paused";
    };

    setState(false);
    let timer = window.setTimeout(() => setState(true), SKY_IDLE_MS);

    const onActivity = () => {
      if (root.dataset.skyState === "playing") setState(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setState(true), SKY_IDLE_MS);
    };

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true, capture: true });
    return () => {
      window.clearTimeout(timer);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity, { capture: true });
      loop.cancel();
      delete root.dataset.skyState;
    };
  }, [theme]);
}
