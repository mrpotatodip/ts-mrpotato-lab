import { PublicChatAppearanceQuerySchema, type PublicChatAppearance } from "@repo/contracts/amelie";
import { createServerFn } from "@tanstack/react-start";

import { apiClient } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { PublicChatAppearanceResponseSchema } from "../schemas";

const DEFAULT_APPEARANCE: PublicChatAppearance = {
  customerChatLabel: "Chat with us",
  customerChatAccent: null,
};

type AppearanceEnvelope = {
  data: PublicChatAppearance | null;
};

type AppearanceGet = (path: string) => Promise<AppearanceEnvelope>;

const getAppearance: AppearanceGet = (path) => apiClient.get(path, PublicChatAppearanceResponseSchema);

export async function loadPublicChatAppearance(
  slug: string,
  get: AppearanceGet = getAppearance,
): Promise<PublicChatAppearance> {
  const { data, error } = await tryCatch(
    get(`/public/chat-bot/appearance?slug=${encodeURIComponent(slug)}`),
  );

  if (error) return DEFAULT_APPEARANCE;
  if (!data.data) return DEFAULT_APPEARANCE;
  return data.data;
}

export const fetchPublicChatAppearance = createServerFn({ method: "GET" })
  .validator(PublicChatAppearanceQuerySchema)
  .handler(async ({ data: { slug } }) => loadPublicChatAppearance(slug));
