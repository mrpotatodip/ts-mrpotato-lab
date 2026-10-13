import { z } from "zod";

export const CheckPublicChatThreadInputSchema = z.object({
  slug: z.string().min(1),
  threadId: z.string().min(1),
  anonymousId: z.string().min(1),
});

export type CheckPublicChatThreadInput = z.infer<typeof CheckPublicChatThreadInputSchema>;
