type SkyKeyframe = { offset: number; backgroundImage: string };

const css = (url: string) => `url("${url}")`;

// -----
// The crossfade as animation keyframes, built from the list of picture urls.
// One loop is `count` steps of hold + fade. Sky i is held from the start of its
// step for `holdMs`, then the browser blends it into sky i + 1 (a cross-fade()
// between two background images) over `fadeMs`. The last step blends back into
// the first, so the loop has no seam.
// -----
export function skyKeyframes(urls: readonly string[], holdMs: number, fadeMs: number): SkyKeyframe[] {
  const step = holdMs + fadeMs;
  const total = step * urls.length;

  const frames = urls.flatMap((url, i): SkyKeyframe[] => [
    { offset: (i * step) / total, backgroundImage: css(url) },
    { offset: (i * step + holdMs) / total, backgroundImage: css(url) },
  ]);
  const first = urls[0];
  return first === undefined ? [] : [...frames, { offset: 1, backgroundImage: css(first) }];
}

// -----
// Where in the loop, in ms, sky `index` sits at the start of its hold.
// -----
export const skyStartTime = (index: number, holdMs: number, fadeMs: number) => index * (holdMs + fadeMs);
