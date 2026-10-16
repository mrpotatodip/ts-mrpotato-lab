import { setMenuItemAvailabilitySvc } from "#/modules/menu";
import { runAsChatBotEditor } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { MenuItemPricingResult } from "#/modules/chat-bot/schemas";
import type { SetMenuItemAvailabilityInput } from "./schema";

export const setMenuItemAvailability = (
  { itemId, isAvailable }: SetMenuItemAvailabilityInput,
  runtime: ChatBotRuntime,
): Promise<MenuItemPricingResult> =>
  runAsChatBotEditor(
    runtime,
    setMenuItemAvailabilitySvc(runtime.db, runtime.owner.tenantId, itemId, isAvailable),
    "store:menu:availability:update",
  );
