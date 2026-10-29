import { playRecipeNotes } from "./play-notes";
import chime from "./sounds/chime";
import pluck from "./sounds/pluck";
import tine from "./sounds/tine";
import uplift from "./sounds/uplift";

export function playShortTune() {
  return playRecipeNotes([
    { recipe: pluck, at: 0, tune: { pitch: 0 } },
    { recipe: pluck, at: 160, tune: { pitch: 3 } },
    { recipe: pluck, at: 320, tune: { pitch: 7 } },
    { recipe: pluck, at: 480, tune: { pitch: 12 } },
    { recipe: tine, at: 640, tune: { pitch: 0 } },
    { recipe: chime, at: 980, tune: { pitch: -2 } },
    { recipe: uplift, at: 1500, tune: { volume: -8, length: 0.7 } },
  ]);
}
