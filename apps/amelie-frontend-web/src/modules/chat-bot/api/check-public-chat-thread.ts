import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS } from "../constants";
import { CheckPublicChatThreadInputSchema } from "../schemas";

// -----
// An expired anonymous thread is a 404, which means
// "gone". Any other failure counts as live: the
// chat then reports it when it loads the thread.
// -----
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

    return { live: !(error instanceof ApiError && error.status === PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS) };
  });
