import { PublicChatFramePolicyQuerySchema } from "@repo/contracts/amelie";
import { createServerFn } from "@tanstack/react-start";

import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { PublicChatFramePolicyResponseSchema } from "../schemas";

type FramePolicyEnvelope = {
  data: { allowedOrigins: string[] } | null;
};

type FramePolicyGet = (path: string) => Promise<FramePolicyEnvelope>;

const getFramePolicy: FramePolicyGet = (path) =>
  apiClient.get(path, PublicChatFramePolicyResponseSchema);

export async function loadPublicChatFrameOrigins(
  slug: string,
  get: FramePolicyGet = getFramePolicy,
): Promise<readonly string[] | null> {
  const { data, error } = await tryCatch(
    get(`/public/chat-bot/frame-policy?slug=${encodeURIComponent(slug)}`),
  );

  if (error instanceof ApiError && error.status === 404) return null;
  if (error) {
    throw new Error(error instanceof ApiError ? error.message : "Failed to load frame policy");
  }
  if (!data.data) return null;
  return data.data.allowedOrigins;
}

export const fetchPublicChatFramePolicy = createServerFn({ method: "GET" })
  .validator(PublicChatFramePolicyQuerySchema)
  .handler(async ({ data: { slug } }) => loadPublicChatFrameOrigins(slug));
