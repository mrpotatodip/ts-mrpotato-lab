import { z } from "zod";
import { ChatBotStreamBodySchema } from "../thread";

// -----
// What TanStack AI's useChat posts: the whole
// message list, not just the new message.
// -----
export const ChatBotWirePartSchema = z
  .object({ type: z.string(), content: z.string().optional() })
  .passthrough();

export const ChatBotWireMessageSchema = z
  .object({
    role: z.string(),
    content: z.string().optional(),
    parts: ChatBotWirePartSchema.array().optional(),
  })
  .passthrough();

export const ChatBotWirePayloadSchema = z.object({ messages: ChatBotWireMessageSchema.array() }).passthrough();

export type ChatBotWirePayload = z.infer<typeof ChatBotWirePayloadSchema>;

const messageText = (message: z.infer<typeof ChatBotWireMessageSchema>): string => {
  const fromParts = (message.parts ?? [])
    .map((part) => (part.type === "text" ? (part.content ?? "") : ""))
    .join("")
    .trim();
  return fromParts || (message.content ?? "").trim();
};

// -----
// The newest user message's text, or undefined.
// -----
export function lastUserTextFromWire(payload: ChatBotWirePayload): string | undefined {
  const last = payload.messages.findLast((message) => message.role === "user");
  const text = last ? messageText(last) : "";
  return text === "" ? undefined : text;
}

// -----
// Accepts a body the engine already knows, or the
// useChat payload: the last user message becomes the
// content, and nothing else is read. useChat's own
// threadId and runId are its client-side ids, not the
// engine's; the thread comes in the URL (?threadId=).
// Anything else fails the same way a bad body always did.
// -----
export const ChatBotStreamRequestSchema = z.preprocess((input) => {
  const wire = ChatBotWirePayloadSchema.safeParse(input);
  if (!wire.success || (typeof input === "object" && input !== null && "content" in input)) return input;
  return { content: lastUserTextFromWire(wire.data) };
}, ChatBotStreamBodySchema);
