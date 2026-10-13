import { toolDefinition } from "@tanstack/ai";
import { defineChatBotTool } from "#/modules/chat-bot/lib";
import { MenuCategoryResultSchema } from "#/modules/chat-bot/schemas";
import { addMenuCategory } from "./function";
import { AddMenuCategoryInputSchema } from "./schema";

export const addMenuCategoryTool = defineChatBotTool({
  definition: toolDefinition({
    name: "addMenuCategory",
    description:
      "Add one empty menu category to this cafe. Pass name, and note null " +
      "unless the team member gave a note that applies to every item in the " +
      "category. Only after the team member confirmed the name. It does not " +
      "add items; those stay a separate change.",
    inputSchema: AddMenuCategoryInputSchema,
    outputSchema: MenuCategoryResultSchema,
  }),
  run: addMenuCategory,
});
