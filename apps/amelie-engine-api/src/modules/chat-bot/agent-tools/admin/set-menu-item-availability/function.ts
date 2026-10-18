import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { setMenuItemAvailabilitySvc } from "#/modules/menu";
import { requireBoundChatBotPower } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { MenuItemPricingResult } from "#/modules/chat-bot/schemas";
import type { SetMenuItemAvailabilityInput } from "./schema";

// -----
// Not Location-scoped, on purpose: this flips the item's own
// isAvailable flag, which is one value for the whole cafe, and
// setMenuItemAvailabilitySvc takes no Location. The per-Location
// sold-out rows are written only by the sold-out-locations
// route. So the Power is checked with none named.
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
