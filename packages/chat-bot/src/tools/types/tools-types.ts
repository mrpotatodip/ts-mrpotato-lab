import type { z } from "zod";
import type { ChatBotToolDisplayConfig } from "@repo/contracts/chat-bots";
import type { ChatBotToolInputFields } from "../schemas";

export type ChatBotResolvedDisplay = ChatBotToolDisplayConfig & { valid: boolean };

export type ChatBotFilledPath = { path: string; rest: ChatBotToolInputFields };

export type ChatBotZodJsonSchema = Parameters<typeof z.fromJSONSchema>[0];
