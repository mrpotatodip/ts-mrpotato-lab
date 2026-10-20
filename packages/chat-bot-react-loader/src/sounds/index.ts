// -----
// The sounds that ship with the loader, from React Bits.
// Import them from here, not from the main entry:
//   import { petalSound, rippleSound } from "@repo/chat-bot-react-loader/sounds";
// -----
export { default as petalSound } from "./petal";
export { default as rippleSound } from "./ripple";
export { setSoundMuted, setSoundVolume, playSound } from "./react-bits-sound";
export type { SoundRecipe, SoundTune } from "./react-bits-sound";
export { useStepSounds } from "../use-step-sounds";
export type { ProgressSound, ProgressSoundLevel, ProgressSounds, ProgressSoundsConfig } from "../use-step-sounds";
