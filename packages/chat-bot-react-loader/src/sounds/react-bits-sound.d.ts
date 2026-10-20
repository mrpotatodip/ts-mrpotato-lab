export type SoundRecipe = object;
export type SoundTune = { volume?: number; pitch?: number; variation?: number; [key: string]: unknown };

export function playSound(recipe: SoundRecipe, tune?: SoundTune): Promise<void>;
export function preloadSound(recipe: SoundRecipe, tune?: SoundTune): void;
export function renderSound(recipe: SoundRecipe, tune?: SoundTune, ...rest: unknown[]): unknown;
export function setSoundMuted(value: boolean): void;
export function setSoundVolume(value: number): void;
export function useSound(recipe: SoundRecipe, tune?: SoundTune): () => void;
