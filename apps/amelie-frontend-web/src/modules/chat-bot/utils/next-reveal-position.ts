import {
  CHAT_BOT_REVEAL_CATCH_UP_PER_CHAR,
  CHAT_BOT_REVEAL_MIN_CHARS_PER_SECOND,
} from "../constants";

// -----
// Characters shown after elapsedMs: faster
// the further behind, so bursts catch up.
// -----
export function nextRevealPosition(
  position: number,
  targetLength: number,
  elapsedMs: number,
): number {
  if (position >= targetLength) return targetLength;
  const behind = targetLength - position;
  const perSecond =
    CHAT_BOT_REVEAL_MIN_CHARS_PER_SECOND + behind * CHAT_BOT_REVEAL_CATCH_UP_PER_CHAR;
  return Math.min(targetLength, position + (perSecond * elapsedMs) / 1000);
}
