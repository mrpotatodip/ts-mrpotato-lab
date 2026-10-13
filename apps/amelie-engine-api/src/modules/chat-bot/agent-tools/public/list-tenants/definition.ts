import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { listTenants } from "./function";
import { ListTenantsResultSchema } from "#/modules/chat-bot/schemas";
import { ListTenantsInputSchema } from "./schema";

export const listTenantsTool = defineChatBotTool({
  definition: toolDefinition({
    name: "listTenants",
    description:
      "List the cafes you can ask about, each with a name and a slug. Use a " +
      "cafe's slug as the last part of the MCP URL: /public/mcp/<slug>. Takes no input.",
    inputSchema: ListTenantsInputSchema,
    outputSchema: ListTenantsResultSchema,
  }),
  run: listTenants,
});
