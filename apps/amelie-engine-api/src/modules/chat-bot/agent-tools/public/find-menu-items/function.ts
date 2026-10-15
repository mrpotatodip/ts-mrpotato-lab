import { runEffect } from "#/lib/effect-query";
import { searchMenuSvc } from "#/modules/menu";
import { dropMenuItemPrices, locationHasNoPricedMenu, menuReadScope, noteWhenLocationUnpriced } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { FindMenuItemsInput, FindMenuItemsResult } from "./schema";

export const findMenuItems = async (
  { locationId, countryId, ...search }: FindMenuItemsInput,
  runtime: ChatBotRuntime,
): Promise<FindMenuItemsResult> => {
  const scope = await menuReadScope({ locationId, countryId }, runtime);
  const includeUnavailable = runtime.owner.kind === "user";
  const unpriced = await locationHasNoPricedMenu(scope, runtime);
  const items = await runEffect(
    searchMenuSvc(
      runtime.db,
      runtime.owner.tenantId,
      search,
      unpriced ? undefined : scope.locationId,
      unpriced ? undefined : scope.countryId,
      includeUnavailable,
    ),
  );
  return {
    location: scope.location,
    country: scope.country,
    note: unpriced ? noteWhenLocationUnpriced(scope) : scope.note,
    items: unpriced ? items.map(dropMenuItemPrices) : items,
  };
};
