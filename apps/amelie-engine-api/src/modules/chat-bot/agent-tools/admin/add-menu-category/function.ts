import { addMenuCategorySvc } from "#/modules/menu";
import { runAsChatBotEditor } from "#/modules/chat-bot/lib";
import type { MenuCategoryResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { AddMenuCategoryInput } from "./schema";

export const addMenuCategory = (
  input: AddMenuCategoryInput,
  runtime: ChatBotRuntime,
): Promise<MenuCategoryResult> =>
  runAsChatBotEditor(runtime, addMenuCategorySvc(runtime.db, runtime.owner.tenantId, input), "company:menu:categories:create");
