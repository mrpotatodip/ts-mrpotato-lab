import { createFileRoute } from "@tanstack/react-router";

import { proxyChatBotGet, proxyChatBotSse } from "#/modules/chat-bot/api/proxy-chat-bot-sse";

export const Route = createFileRoute("/api/chat-bot")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyChatBotGet(request),
      POST: async ({ request }) => proxyChatBotSse(request),
    },
  },
});
