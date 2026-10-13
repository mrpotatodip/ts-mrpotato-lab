import { Effect } from "effect";
import { updateMenuItemPriceSvc } from "#/modules/menu";
import { resolveWriteCountry, runAsChatBotEditor } from "#/modules/chat-bot/lib";
import type { CountryNeededResult, MenuItemPricingResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { UpdateMenuItemPriceInput } from "./schema";

// -----
// The price changes in one Country only: the one
// named, or the cafe's only one. Otherwise nothing
// is written and the Countries come back to ask about.
// -----
export const updateMenuItemPrice = (
  { itemId, variantName, price, countryId: requested }: UpdateMenuItemPriceInput,
  runtime: ChatBotRuntime,
): Promise<MenuItemPricingResult | CountryNeededResult> =>
  runAsChatBotEditor(
    runtime,
    Effect.gen(function* () {
      const tenantId = runtime.owner.tenantId;
      const chosen = yield* resolveWriteCountry(runtime.db, tenantId, requested);
      if ("needsCountry" in chosen) return chosen;
      return yield* updateMenuItemPriceSvc(runtime.db, tenantId, itemId, {
        variantName,
        price,
        countryId: chosen.countryId,
      });
    }),
  );
