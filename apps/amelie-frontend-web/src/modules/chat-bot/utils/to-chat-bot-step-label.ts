import { CHAT_BOT_STEP_LABELS, CHAT_BOT_STEP_LABEL_FALLBACK } from "../constants";
import type { ChatBotStepLabel } from "../types";

// -----
// A friendly label for a helper or tool,
// never its code name.
// -----
export function toChatBotStepLabel(name: string | null | undefined): ChatBotStepLabel {
  return (name ? CHAT_BOT_STEP_LABELS.get(name) : undefined) ?? CHAT_BOT_STEP_LABEL_FALLBACK;
}
