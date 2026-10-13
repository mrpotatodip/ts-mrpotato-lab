import { z } from "zod";
import {
  ChatBotThreadDeletedSchema,
  ChatBotThreadDetailSchema,
  ChatBotThreadIdSchema,
  ChatBotThreadListItemSchema,
  ChatBotTitleBodySchema,
} from "@repo/contracts/chat-bots";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const ChatBotThreadRouteParamSchema = z.object({
  threadId: ChatBotThreadIdSchema,
});

const ChatBotWirePartSchema = z
  .object({
    type: z.string(),
    content: z.string().optional(),
    raw: z.string().optional(),
    name: z.string().optional(),
    data: z.object({ answer: z.string().optional() }).optional(),
  })
  .passthrough();

export const ChatBotWirePayloadSchema = z
  .object({
    messages: z
      .object({
        role: z.string(),
        content: z.string().optional(),
        parts: ChatBotWirePartSchema.array().optional(),
      })
      .passthrough()
      .array(),
  })
  .passthrough();

export type ChatBotWirePayload = z.infer<typeof ChatBotWirePayloadSchema>;

export const ChatBotThreadsResponseSchema = apiResponseSchema(
  ChatBotThreadListItemSchema.array(),
);

export const ChatBotThreadListItemResponseSchema = apiResponseSchema(
  ChatBotThreadListItemSchema,
);

export const ChatBotThreadDetailResponseSchema = apiResponseSchema(
  ChatBotThreadDetailSchema,
);

export const ChatBotThreadDeletedResponseSchema = apiResponseSchema(
  ChatBotThreadDeletedSchema,
);

export const ChatBotTitleInputSchema = ChatBotTitleBodySchema.extend({
  id: ChatBotThreadIdSchema,
});

export type ChatBotTitleInput = z.infer<typeof ChatBotTitleInputSchema>;
