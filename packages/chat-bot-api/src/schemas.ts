import { z } from "zod";
import {
  CHAT_BOT_TURN_ROLE_VALUES,
  ChatBotJsonSchema,
  ChatBotRunIdSchema,
  ChatBotStructureSchema,
  ChatBotThreadDetailSchema,
  ChatBotThreadIdSchema,
} from "./contracts";

// -----
// TanStack's resume header. The service reads
// it raw, so the route checks it here.
// -----
export const ChatBotStreamHeaderSchema = z.object({
  "x-run-id": ChatBotRunIdSchema.optional(),
});

// -----
// Twin of a `status IN (...)` CHECK on the
// store's run table; a run closes as a
// non-running one.
// -----
const ChatBotRunStatusSchema = z.enum(["running", "completed", "failed"]);

const ChatBotRunCloseStatusSchema = ChatBotRunStatusSchema.exclude(["running"]);

export const ChatBotThreadRefSchema = ChatBotThreadDetailSchema.pick({
  id: true,
  title: true,
  trigger: true,
  module: true,
});

export const ChatBotRunRefRowSchema = z.object({
  id: ChatBotRunIdSchema,
  threadId: ChatBotThreadIdSchema,
});

export const ChatBotAssistantMessageSchema = z.object({
  threadId: ChatBotThreadIdSchema,
  scopeId: z.string().min(1),
  content: z.string(),
  toolsUsed: z.array(z.string()),
  structure: ChatBotStructureSchema,
});

// -----
// useChat's hydrate payload: every turn is
// text; an assistant turn's cards ride on
// metadata.chatBot.
// -----
const ChatBotHydrateTextPartSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
});

export const ChatBotHydrateMessageSchema = z.object({
  id: z.string(),
  role: z.enum(CHAT_BOT_TURN_ROLE_VALUES),
  parts: z.array(ChatBotHydrateTextPartSchema),
  metadata: z
    .object({
      chatBot: z.object({
        toolsUsed: z.array(z.string()),
        structure: ChatBotStructureSchema,
      }),
    })
    .optional(),
});

// -----
// The model stream chunks the turn collector
// reads to build the saved answer and cards.
// -----
export const ChatBotTextContentChunkSchema = z.object({
  type: z.literal("TEXT_MESSAGE_CONTENT"),
  messageId: z.string(),
  delta: z.string(),
  subagentRunId: z.string().optional(),
});

export const ChatBotToolCallStartChunkSchema = z.object({
  type: z.literal("TOOL_CALL_START"),
  toolCallId: z.string(),
  toolCallName: z.string(),
});

export const ChatBotToolCallResultChunkSchema = z.object({
  type: z.literal("TOOL_CALL_RESULT"),
  toolCallId: z.string(),
  content: ChatBotJsonSchema,
});

const ChatBotSpecUsageSchema = z.object({
  model: z.string().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  cachedInputTokens: z.number().optional(),
});

const ChatBotTanstackUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  promptTokensDetails: z.object({ cachedTokens: z.number().optional() }).optional(),
});

export const ChatBotRunFinishedChunkSchema = z.object({
  type: z.literal("RUN_FINISHED"),
  model: z.string().optional(),
  usage: z.union([z.array(ChatBotSpecUsageSchema), ChatBotTanstackUsageSchema]).optional(),
});

export type ChatBotRunCloseStatus = z.infer<typeof ChatBotRunCloseStatusSchema>;
export type ChatBotRunFinishedChunk = z.infer<typeof ChatBotRunFinishedChunkSchema>;
export type ChatBotThreadRef = z.infer<typeof ChatBotThreadRefSchema>;
export type ChatBotRunRefRow = z.infer<typeof ChatBotRunRefRowSchema>;
export type ChatBotAssistantMessage = z.infer<typeof ChatBotAssistantMessageSchema>;
export type ChatBotHydrateMessage = z.infer<typeof ChatBotHydrateMessageSchema>;
