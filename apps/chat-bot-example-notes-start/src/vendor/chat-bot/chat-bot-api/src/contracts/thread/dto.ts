import { z } from "zod";
import {
  CHAT_BOT_DEFAULT_MODULE,
  CHAT_BOT_DEFAULT_TRIGGER,
  CHAT_BOT_LOOKUP_ID_PATTERN,
  CHAT_BOT_RUN_ID_MAX,
  CHAT_BOT_RUN_ID_PATTERN,
  CHAT_BOT_THREAD_TITLE_MAX,
} from "../constants";
import { CHAT_BOT_TURN_ROLE_VALUES } from "../enums";
import { ChatBotStructureSchema } from "../structure";

// -----
// Requests: what the frontend sends
// -----
export const ChatBotLookupIdSchema = z.string().regex(CHAT_BOT_LOOKUP_ID_PATTERN);

export const ChatBotThreadIdSchema = z.string().uuid();

export const ChatBotRunIdSchema = z
  .string()
  .max(CHAT_BOT_RUN_ID_MAX)
  .regex(CHAT_BOT_RUN_ID_PATTERN);

export const ChatBotThreadParamSchema = z.object({
  id: ChatBotThreadIdSchema,
});

export const ChatBotThreadsQuerySchema = z.object({
  trigger: ChatBotLookupIdSchema.optional(),
  module: ChatBotLookupIdSchema.optional(),
});

export const ChatBotStreamQuerySchema = z.object({
  threadId: ChatBotThreadIdSchema.optional(),
  runId: ChatBotRunIdSchema.optional(),
  offset: z.string().optional(),
});

export const ChatBotStreamBodySchema = z.object({
  threadId: ChatBotThreadIdSchema.optional(),
  content: z.string().min(1),
  title: z.string().trim().min(1).max(CHAT_BOT_THREAD_TITLE_MAX).optional(),
  trigger: ChatBotLookupIdSchema.default(CHAT_BOT_DEFAULT_TRIGGER),
  module: ChatBotLookupIdSchema.default(CHAT_BOT_DEFAULT_MODULE),
});

export const ChatBotTitleBodySchema = z.object({
  title: z.string().trim().min(1).max(CHAT_BOT_THREAD_TITLE_MAX),
});

// -----
// Responses: what the backend returns
// -----
export const ChatBotThreadListItemSchema = z.object({
  id: ChatBotThreadIdSchema,
  createdAt: z.coerce.date().transform((d) => d.toISOString()),
  updatedAt: z.coerce.date().transform((d) => d.toISOString()),
  title: z.string().nullable(),
  trigger: z.string(),
  module: z.string(),
});

export const ChatBotMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(CHAT_BOT_TURN_ROLE_VALUES),
  content: z.string(),
  toolsUsed: z.array(z.string()),
  structure: ChatBotStructureSchema.nullable(),
  createdAt: z.coerce.date().transform((d) => d.toISOString()),
});

export const ChatBotThreadDetailSchema = z.object({
  id: ChatBotThreadIdSchema,
  title: z.string().nullable(),
  trigger: z.string(),
  module: z.string(),
  messages: ChatBotMessageSchema.array(),
});

export const ChatBotThreadDeletedSchema = z.object({
  id: ChatBotThreadIdSchema,
});

export type ChatBotLookupId = z.infer<typeof ChatBotLookupIdSchema>;
export type ChatBotThreadId = z.infer<typeof ChatBotThreadIdSchema>;
export type ChatBotRunId = z.infer<typeof ChatBotRunIdSchema>;
export type ChatBotThreadParam = z.infer<typeof ChatBotThreadParamSchema>;
export type ChatBotThreadsQuery = z.infer<typeof ChatBotThreadsQuerySchema>;
export type ChatBotStreamQuery = z.infer<typeof ChatBotStreamQuerySchema>;
export type ChatBotStreamBody = z.infer<typeof ChatBotStreamBodySchema>;
export type ChatBotTitleBody = z.infer<typeof ChatBotTitleBodySchema>;
export type ChatBotThreadListItem = z.infer<typeof ChatBotThreadListItemSchema>;
export type ChatBotMessage = z.infer<typeof ChatBotMessageSchema>;
export type ChatBotThreadDetail = z.infer<typeof ChatBotThreadDetailSchema>;
export type ChatBotThreadDeleted = z.infer<typeof ChatBotThreadDeletedSchema>;
