import type { z } from "zod";
import {
  ChatBotJsonSchema,
  ChatBotKeyValueDisplayOptionsSchema,
  ChatBotListDisplayOptionsSchema,
  ChatBotNumberDisplayOptionsSchema,
  ChatBotTableDisplayOptionsSchema,
  ChatBotToolDisplaySchema,
  type ChatBotJson,
  type ChatBotToolDisplay,
} from "@repo/contracts/chat-bots";
import type { ChatBotResolvedDisplay } from "./types";

const OPTIONS_BY_DISPLAY = {
  number: ChatBotNumberDisplayOptionsSchema,
  key_value: ChatBotKeyValueDisplayOptionsSchema,
  table: ChatBotTableDisplayOptionsSchema,
  list: ChatBotListDisplayOptionsSchema,
} satisfies Record<ChatBotToolDisplay, z.ZodType>;

function keyValueFallback(): ChatBotResolvedDisplay {
  return { display: "key_value", displayOptions: {}, valid: false };
}

// -----
// Check a row's display + options. Invalid
// falls back to key_value so a card still shows.
// -----
export function resolveChatBotToolDisplay(
  display: string | null,
  displayOptions: ChatBotJson | null,
): ChatBotResolvedDisplay {
  if (display == null) return { display: null, displayOptions: null, valid: true };
  const known = ChatBotToolDisplaySchema.safeParse(display);
  if (!known.success) return keyValueFallback();
  const options = OPTIONS_BY_DISPLAY[known.data].safeParse(displayOptions ?? {});
  if (!options.success) return keyValueFallback();
  return {
    display: known.data,
    displayOptions: ChatBotJsonSchema.parse(options.data),
    valid: true,
  };
}
