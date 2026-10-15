import { runEffect } from "#/lib/effect-query";
import { listMenuSvc } from "#/modules/menu";
import { CHAT_BOT_MENU_LOCATION_UNPRICED_NOTE } from "#/modules/chat-bot/constants";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { MenuReadScope } from "./chat-bot-country";
import { joinToolNotes } from "./chat-bot-location-needed";

export const dropMenuItemPrices = <T extends { price: string | null; currency: string | null; variants: unknown }>(
  item: T,
): T => ({ ...item, price: null, currency: null, variants: null });

export const locationHasNoPricedMenu = async (scope: MenuReadScope, runtime: ChatBotRuntime): Promise<boolean> => {
  if (!scope.locationId) return false;
  const categories = await runEffect(
    listMenuSvc(
      runtime.db,
      runtime.owner.tenantId,
      scope.locationId,
      scope.countryId,
      runtime.owner.kind === "user",
    ),
  );
  return categories.every((category) => category.items.length === 0);
};

export const noteWhenLocationUnpriced = (scope: MenuReadScope): string | null => {
  if (!scope.location) return scope.note;
  return joinToolNotes(
    scope.note,
    CHAT_BOT_MENU_LOCATION_UNPRICED_NOTE(scope.location.name, scope.country?.name ?? null),
  );
};
