import { createOpenaiChat } from "@tanstack/ai-openai";
import { createChatBotRunner, type ChatBotRunner } from "@repo/chat-bot-api";
import type { Services } from "./notes";

type OpenaiModel = Parameters<typeof createOpenaiChat>[0];

// -----
// Your key and your model, set by you. The engine
// asks for an adapter by model name; this is where
// the name meets the key. Another provider is the
// same shape: return its adapter from adapterFor.
// -----
export function openaiRunner(apiKey: string): ChatBotRunner<Services> {
  return createChatBotRunner<Services>({
    // -----
    // SAFETY: the name comes from your own config
    // and must be a model OpenAI serves.
    // -----
    adapterFor: (model) => createOpenaiChat(model as OpenaiModel, apiKey),
  });
}
