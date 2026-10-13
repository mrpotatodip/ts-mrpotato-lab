import { createServerFn } from "@tanstack/react-start";
import { apiClient, ApiError } from "#/lib/api-client";
import { tryCatch } from "#/lib/try-catch";
import { withActiveTenant } from "#/lib/active-tenant";
import { ChatBotThreadsQuerySchema } from "@repo/contracts/chat-bots";
import { ChatBotThreadsResponseSchema } from "../schemas";

export const fetchChatBotThreads = createServerFn({ method: "GET" })
  .validator(ChatBotThreadsQuerySchema)
  .handler(async ({ data: query }) => {
    const params = new URLSearchParams();
    if (query.trigger) params.set("trigger", query.trigger);
    if (query.module) params.set("module", query.module);
    const qs = params.toString();

    const { data, error } = await tryCatch(
      apiClient.get(
        await withActiveTenant(`/chat-bot/threads${qs ? `?${qs}` : ""}`),
        ChatBotThreadsResponseSchema,
      ),
    );

    if (error) {
      throw new Error(
        error instanceof ApiError ? error.message : "Failed to load chats",
      );
    }

    if (!data.data) {
      throw new Error("Failed to load chats");
    }

    return data.data;
  });
