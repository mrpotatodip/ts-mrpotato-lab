import { z } from "zod";
import { ChatBotStreamBodySchema } from "../../chat-bots";
import { PublicChatCountrySchema, PublicChatLocationSchema } from "../public-chat";

export const StaffChatStreamBodySchema = ChatBotStreamBodySchema.extend({
  location: PublicChatLocationSchema.optional(),
  country: PublicChatCountrySchema.optional(),
});

export type StaffChatStreamBody = z.infer<typeof StaffChatStreamBodySchema>;
