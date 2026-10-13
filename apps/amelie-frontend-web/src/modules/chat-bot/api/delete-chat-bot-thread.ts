import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ChatBotThreadIdSchema } from "@repo/contracts/chat-bots";
import { ChatBotThreadDeletedResponseSchema } from "../schemas";

export const deleteChatBotThread = createServerFn({ method: "POST" })
  .validator(z.object({ id: ChatBotThreadIdSchema }))
  .handler(async ({ data: { id } }) => {
    const { data, error } = await tryCatch(
      apiClient.delete(await withActiveTenant(`/chat-bot/threads/${id}`), ChatBotThreadDeletedResponseSchema),
    );

    if (error) {
      throw new Error(
        error instanceof ApiError ? error.message : "Failed to delete chat",
      );
    }

    if (!data.data) {
      throw new Error("Failed to delete chat");
    }

    return data.data;
  });
