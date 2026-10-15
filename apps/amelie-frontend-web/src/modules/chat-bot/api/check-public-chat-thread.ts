import { createServerFn } from "@tanstack/react-start";
import { apiClient } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { CheckPublicChatThreadInputSchema } from "../schemas";

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
