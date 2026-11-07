import { z } from "zod";
import { ChatBotStreamQuerySchema, ChatBotThreadIdSchema } from "../../chat-bots";
import { PUBLIC_CHAT_MESSAGE_MAX_LENGTH } from "../constants";

// -----
// Requests: what the widget sends. Only the
// slug names a Tenant; no tenantId is read.
// -----
export const PublicChatSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/);

export const PublicChatHeaderSchema = z.object({
  "x-anonymous-id": z.uuid(),
});

export const PublicChatStreamBodySchema = z.object({
  slug: PublicChatSlugSchema,
  threadId: ChatBotThreadIdSchema.optional(),
  content: z.string().trim().min(1).max(PUBLIC_CHAT_MESSAGE_MAX_LENGTH),
});

export const PublicChatHydrateQuerySchema = ChatBotStreamQuerySchema.extend({
  slug: PublicChatSlugSchema,
});

export type PublicChatStreamBody = z.infer<typeof PublicChatStreamBodySchema>;
export type PublicChatHydrateQuery = z.infer<typeof PublicChatHydrateQuerySchema>;
