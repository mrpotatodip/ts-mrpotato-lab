import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ChatBotThreadIdSchema } from "@repo/contracts/chat-bots";
import { ChatBotThreadDetailResponseSchema } from "../schemas";

export const fetchChatBotThread = createServerFn({ method: "GET" })
  .validator(z.object({ id: ChatBotThreadIdSchema }))
  .handler(async ({ data: { id } }) => {
    const { data, error } = await tryCatch(
      apiClient.get(await withActiveTenant(`/chat-bot/threads/${id}`), ChatBotThreadDetailResponseSchema),
    );

    if (error) {
      throw new Error(
        error instanceof ApiError ? error.message : "Failed to load chat",
      );
    }

    if (!data.data) {
      throw new Error("Failed to load chat");
    }

    return data.data;
  });
