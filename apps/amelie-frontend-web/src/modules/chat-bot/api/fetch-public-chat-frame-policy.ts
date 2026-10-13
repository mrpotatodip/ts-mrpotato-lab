import { PublicChatFramePolicySchema } from "@repo/contracts/amelie";
import { z } from "zod";

import { API_BASE_URL } from "#/lib/api-base-url";

const EnvelopeSchema = z.object({
  data: PublicChatFramePolicySchema,
  error: z.null(),
});

export async function fetchPublicChatFramePolicy(slug: string): Promise<readonly string[] | null> {
  const url = `${API_BASE_URL}/public/chat-bot/frame-policy?slug=${encodeURIComponent(slug)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`frame policy ${response.status}`);
  return EnvelopeSchema.parse(await response.json()).data.allowedOrigins;
}
