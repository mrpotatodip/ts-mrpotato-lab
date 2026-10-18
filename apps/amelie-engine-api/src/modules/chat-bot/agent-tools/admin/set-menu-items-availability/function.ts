import { Effect } from "effect";
import { setMenuItemAvailabilitySvc } from "#/modules/menu";
import { runEffect } from "#/lib/effect-query";
import { requireItemWideChatBotPower } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetMenuItemsAvailabilityInput, SetMenuItemsAvailabilityResult } from "./schema";

export const setMenuItemsAvailability = (
  { itemIds, isAvailable }: SetMenuItemsAvailabilityInput,
  runtime: ChatBotRuntime,
): Promise<SetMenuItemsAvailabilityResult> =>
  runEffect(
    requireItemWideChatBotPower(runtime, "store:menu:availability:update").pipe(Effect.andThen(
    Effect.forEach([...new Set(itemIds)], (itemId) =>
      setMenuItemAvailabilitySvc(runtime.db, runtime.owner.tenantId, itemId, isAvailable).pipe(
        Effect.map((item) => ({ item })),
        Effect.catchTag("NotFound", () => Effect.succeed({ missing: itemId })),
      ),
    ).pipe(
      Effect.map((results) => ({
        items: results.flatMap((result) => ("item" in result ? [result.item] : [])),
        notFound: results.flatMap((result) => ("missing" in result ? [result.missing] : [])),
      })),
    )),
    ),
  );
