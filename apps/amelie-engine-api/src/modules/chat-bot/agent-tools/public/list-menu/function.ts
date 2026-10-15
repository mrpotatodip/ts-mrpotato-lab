import { runEffect } from "#/lib/effect-query";
import { listMenuSvc } from "#/modules/menu";
import { dropMenuItemPrices, locationHasNoPricedMenu, menuReadScope, noteWhenLocationUnpriced } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { ListMenuInput, ListMenuResult } from "./schema";

export const listMenu = async (input: ListMenuInput, runtime: ChatBotRuntime): Promise<ListMenuResult> => {
  const scope = await menuReadScope(input, runtime);
  const includeUnavailable = runtime.owner.kind === "user";
  const unpriced = await locationHasNoPricedMenu(scope, runtime);
  const categories = await runEffect(
    listMenuSvc(
      runtime.db,
      runtime.owner.tenantId,
      unpriced ? undefined : scope.locationId,
      unpriced ? undefined : scope.countryId,
      includeUnavailable,
    ),
  );
  return {
    location: scope.location,
    country: scope.country,
    note: unpriced ? noteWhenLocationUnpriced(scope) : scope.note,
    categories: unpriced
      ? categories.map((category) => ({ ...category, items: category.items.map(dropMenuItemPrices) }))
      : categories,
  };
};
