import { CHAT_BOT_THREAD_TITLE_MAX } from "../contracts";
import {
  CHAT_BOT_THREAD_TITLE_FALLBACK,
  CHAT_BOT_THREAD_TITLE_WORD_LIMIT,
} from "../constants";

// -----
// First user message seeds Title; later
// messages must not overwrite a rename.
// -----
export function chatBotThreadTitleFromContent(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const title = words.slice(0, CHAT_BOT_THREAD_TITLE_WORD_LIMIT).join(" ");
  if (!title) return CHAT_BOT_THREAD_TITLE_FALLBACK;
  return title.slice(0, CHAT_BOT_THREAD_TITLE_MAX);
}
