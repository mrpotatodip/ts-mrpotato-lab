import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import {
  ChatBotThreadListItemResponseSchema,
  ChatBotTitleInputSchema,
} from "../schemas";

export const patchChatBotThreadTitle = createServerFn({ method: "POST" })
  .validator(ChatBotTitleInputSchema)
  .handler(async ({ data: { id, title } }) => {
    const { data, error } = await tryCatch(
      apiClient.patch(
        await withActiveTenant(`/chat-bot/threads/${id}`),
        ChatBotThreadListItemResponseSchema,
        { title },
      ),
    );

    if (error) {
      throw new Error(
        error instanceof ApiError ? error.message : "Failed to rename chat",
      );
    }

    if (!data.data) {
      throw new Error("Failed to rename chat");
    }

    return data.data;
  });
