import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS } from "../constants";
import { CheckPublicChatThreadInputSchema } from "../schemas";
import { readPublicChatThreadId, writePublicChatThreadId } from "../utils";

type PublicChatThreadCheck = (input: {
  data: { slug: string; threadId: string; anonymousId: string };
}) => Promise<{ live: boolean }>;

export const checkPublicChatThread = createServerFn({ method: "GET" })
  .validator(CheckPublicChatThreadInputSchema)
  .handler(async ({ data: { slug, threadId, anonymousId } }) => {
    const { error } = await tryCatch(
      apiClient.get(
        `/public/chat-bot?slug=${encodeURIComponent(slug)}&threadId=${encodeURIComponent(threadId)}`,
        undefined,
        { headers: { "X-Anonymous-Id": anonymousId } },
      ),
    );

    return { live: error == null };
  });

export async function livePublicChatThreadId(
  slug: string,
  anonymousId: string,
  check: PublicChatThreadCheck = checkPublicChatThread,
): Promise<string | null> {
  const stored = readPublicChatThreadId(slug);
  if (!stored) return null;
  const { live } = await check({ data: { slug, threadId: stored, anonymousId } }).catch(() => ({
    live: false,
  }));
  if (live) return stored;
  writePublicChatThreadId(slug, null);
  return null;
}
