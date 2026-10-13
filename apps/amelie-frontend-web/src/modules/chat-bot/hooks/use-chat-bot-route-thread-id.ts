import { useParams } from "@tanstack/react-router";

import { ChatBotThreadRouteParamSchema } from "../schemas";

// -----
// Runs under /chat-bot and /chat-bot/$threadId,
// so params aren't tied to one route.
// -----
export function useChatBotRouteThreadId(): string | undefined {
  const params = useParams({ strict: false });
  const parsed = ChatBotThreadRouteParamSchema.safeParse(params);
  return parsed.success ? parsed.data.threadId : undefined;
}
