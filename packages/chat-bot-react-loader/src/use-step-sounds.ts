import { useEffect, useRef } from "react";
import type { AGUILoadingStackedState, AGUILoadingStackedStep } from "./agui-loading";
import type { SoundRecipe, SoundTune } from "./sounds/react-bits-sound";

export type ProgressSound = SoundRecipe | { recipe: SoundRecipe; tune?: SoundTune };

// -----
// One sound per level of the turn, played when that level
// finishes. The keys match `labels`: run, reply, tools,
// subagents. tools and subagents take one sound for all, or
// a map by name like labels do (an unlisted name is silent).
// reasoning is the model thinking; turn is the whole turn.
// Leave a key out for silence at that level.
// -----
export type ProgressSounds = {
  run?: ProgressSound;
  reply?: ProgressSound;
  tools?: ProgressSound | Record<string, ProgressSound>;
  subagents?: ProgressSound | Record<string, ProgressSound>;
  reasoning?: ProgressSound;
  turn?: ProgressSound;
};
export type ProgressSoundLevel = keyof ProgressSounds;

// -----
// The `sounds` prop. `start` plays as a level starts, `end` as
// it finishes. Each is `true` (a built-in sound at every
// level) or the levels you pick. `sounds` alone set to `true`
// turns on both.
// -----
export type ProgressSoundsConfig =
  | boolean
  | { start?: boolean | ProgressSounds; end?: boolean | ProgressSounds };

const isSound = (value: object): value is ProgressSound => "recipe" in value || "layers" in value;

// A single sound, or the one for this name out of a map.
function pickSound(
  entry: ProgressSound | Record<string, ProgressSound> | undefined,
  name: string | null,
): ProgressSound | undefined {
  if (!entry) return undefined;
  if (isSound(entry)) return entry;
  return name == null ? undefined : (entry as Record<string, ProgressSound>)[name];
}

// -----
// `true` on a sounds prop means a built-in sound at every
// level except `run` and `turn`. Those two always start or
// end together with another level, so a sound on them only
// doubles up. Set them yourself if you want them. Built-in
// sounds are loaded only when first played, so an app that
// sets no sounds never downloads the audio code.
// -----
export type BuiltinSound = "petal" | "ripple";
type Spec = ProgressSounds | BuiltinSound;
type Playable = ProgressSound | { builtin: BuiltinSound };

function soundFor(spec: Spec, step: AGUILoadingStackedStep): Playable | undefined {
  if (typeof spec === "string") {
    return step.kind === "error" || step.kind === "run" ? undefined : { builtin: spec };
  }
  switch (step.kind) {
    case "run":
      return spec.run;
    case "message":
      return spec.reply;
    case "reasoning":
      return spec.reasoning;
    case "tool":
      return pickSound(spec.tools, step.toolCallName);
    case "subagent":
      return pickSound(spec.subagents, step.subagentName);
    default:
      return undefined;
  }
}

const turnSound = (spec: Spec | undefined): Playable | undefined =>
  typeof spec === "string" ? undefined : spec?.turn;

// Each piece is fetched once, on first use.
let engine: Promise<typeof import("./sounds/react-bits-sound")> | undefined;
const loadEngine = () => (engine ??= import("./sounds/react-bits-sound"));
const recipes: Partial<Record<BuiltinSound, Promise<SoundRecipe>>> = {};
const loadRecipe = (name: BuiltinSound) =>
  (recipes[name] ??=
    name === "petal"
      ? import("./sounds/petal").then((m) => m.default)
      : import("./sounds/ripple").then((m) => m.default));

async function play(sound: Playable) {
  try {
    const { playSound } = await loadEngine();
    if ("builtin" in sound) await playSound(await loadRecipe(sound.builtin));
    else if ("recipe" in sound) await playSound(sound.recipe, sound.tune);
    else await playSound(sound);
  } catch {
    // A sound that cannot play must never break the display.
  }
}

const isLive = (status: string) => status === "running" || status === "waiting";

// -----
// Plays a row's sound once as it appears (`start`) and once
// as it turns done (`end`). Rows already there when this
// mounts stay silent. A row id reused by the next turn plays
// again. `turn` plays as the turn starts and as it finishes.
// -----
export function useStepSounds(state: AGUILoadingStackedState, sounds: ProgressSoundsConfig | undefined) {
  const config = sounds === true ? { start: true, end: true } : sounds || {};
  const start: Spec | undefined = config.start === true ? "ripple" : config.start || undefined;
  const end: Spec | undefined = config.end === true ? "petal" : config.end || undefined;
  const seen = useRef<{ present: Set<string>; done: Set<string> } | null>(null);
  const lastStatus = useRef(state.status);

  useEffect(() => {
    const wasLive = isLive(lastStatus.current);
    lastStatus.current = state.status;
    if (!start && !end) {
      seen.current = null;
      return;
    }
    const present = new Set(state.stepOrder);
    const done = new Set<string>();
    for (const id of state.stepOrder) {
      if (state.steps[id]?.status === "done") done.add(id);
    }
    const before = seen.current;
    seen.current = { present, done };
    if (!before) return;

    for (const id of present) {
      const step = state.steps[id]!;
      const sound = !before.present.has(id) && start && soundFor(start, step);
      if (sound) void play(sound);
    }
    for (const id of done) {
      const sound = !before.done.has(id) && end && soundFor(end, state.steps[id]!);
      if (sound) void play(sound);
    }
    if (!wasLive && isLive(state.status) && turnSound(start)) void play(turnSound(start)!);
    if (wasLive && state.status === "done" && turnSound(end)) void play(turnSound(end)!);
  }, [state, start, end]);
}
