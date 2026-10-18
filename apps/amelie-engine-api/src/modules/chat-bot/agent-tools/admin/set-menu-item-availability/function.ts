import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { setMenuItemAvailabilitySvc } from "#/modules/menu";
import { requireBoundChatBotPower } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { MenuItemPricingResult } from "#/modules/chat-bot/schemas";
import type { SetMenuItemAvailabilityInput } from "./schema";

// -----
// The item names no Location here; which Location an item's
// availability belongs to is decided with the menu routes
// (ticket 06). Until then the Power is checked with none named.
// -----
export const setMenuItemAvailability = (
  { itemId, isAvailable }: SetMenuItemAvailabilityInput,
  runtime: ChatBotRuntime,
): Promise<MenuItemPricingResult> =>
  runEffect(
    requireBoundChatBotPower(runtime, "store:menu:availability:update", []).pipe(
      Effect.andThen(setMenuItemAvailabilitySvc(runtime.db, runtime.owner.tenantId, itemId, isAvailable)),
    ),
  );
