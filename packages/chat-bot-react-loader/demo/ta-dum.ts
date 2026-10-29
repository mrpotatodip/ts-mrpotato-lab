import { playSound } from "../src/sounds/react-bits-sound";
import tudum from "./sounds/tudum";

export function playTaDum() {
  void playSound(tudum);
  return [];
}
