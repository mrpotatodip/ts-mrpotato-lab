import { playSound, type SoundRecipe, type SoundTune } from "../src/sounds/react-bits-sound";

export type RecipeNote = {
  recipe: SoundRecipe;
  at: number;
  tune?: SoundTune;
};

export function playRecipeNotes(notes: RecipeNote[]): number[] {
  return notes.map((note) =>
    window.setTimeout(() => {
      void playSound(note.recipe, note.tune);
    }, note.at),
  );
}
