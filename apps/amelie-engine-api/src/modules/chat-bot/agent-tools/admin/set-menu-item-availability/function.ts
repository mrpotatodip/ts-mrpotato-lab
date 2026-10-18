import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { setMenuItemAvailabilitySvc } from "#/modules/menu";
import { requireItemWideChatBotPower } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { MenuItemPricingResult } from "#/modules/chat-bot/schemas";
import type { SetMenuItemAvailabilityInput } from "./schema";

export const setMenuItemAvailability = (
  { itemId, isAvailable }: SetMenuItemAvailabilityInput,
  runtime: ChatBotRuntime,
): Promise<MenuItemPricingResult> =>
  runEffect(
    requireItemWideChatBotPower(runtime, "store:menu:availability:update").pipe(
      Effect.andThen(setMenuItemAvailabilitySvc(runtime.db, runtime.owner.tenantId, itemId, isAvailable)),
    ),
  );
