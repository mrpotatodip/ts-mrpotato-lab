import { z } from "zod";
import { ChatBotStreamQuerySchema, ChatBotThreadIdSchema } from "../../chat-bots";
import { PUBLIC_CHAT_MESSAGE_MAX_LENGTH } from "../constants";

// -----
// Requests: what the widget sends. Only the
// slug names a Tenant; no tenantId is read.
// -----
export const PublicChatSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/);

export const PublicChatLocationSchema = z.string().trim().min(1).max(64);

// A Country by code (CA), name or id.
export const PublicChatCountrySchema = z.string().trim().min(1).max(64);

export const PublicChatHeaderSchema = z.object({
  "x-anonymous-id": z.uuid(),
});

export const PublicChatStreamBodySchema = z.object({
  slug: PublicChatSlugSchema,
  threadId: ChatBotThreadIdSchema.optional(),
  location: PublicChatLocationSchema.optional(),
  country: PublicChatCountrySchema.optional(),
  content: z.string().trim().min(1).max(PUBLIC_CHAT_MESSAGE_MAX_LENGTH),
});

export const PublicChatHydrateQuerySchema = ChatBotStreamQuerySchema.extend({
  slug: PublicChatSlugSchema,
});

export const PublicChatFramePolicyQuerySchema = z.object({
  slug: PublicChatSlugSchema,
});

export const PublicChatFramePolicySchema = z.object({
  allowedOrigins: z.array(z.string()),
});

export const PublicChatAppearanceQuerySchema = PublicChatFramePolicyQuerySchema;

export const PublicChatAppearanceSchema = z.object({
  customerChatLabel: z.string(),
  customerChatAccent: z.string().nullable(),
});

export type PublicChatStreamBody = z.infer<typeof PublicChatStreamBodySchema>;
export type PublicChatHydrateQuery = z.infer<typeof PublicChatHydrateQuerySchema>;
export type PublicChatFramePolicyQuery = z.infer<typeof PublicChatFramePolicyQuerySchema>;
export type PublicChatFramePolicy = z.infer<typeof PublicChatFramePolicySchema>;
export type PublicChatAppearanceQuery = z.infer<typeof PublicChatAppearanceQuerySchema>;
export type PublicChatAppearance = z.infer<typeof PublicChatAppearanceSchema>;
