import { runEffect } from "#/lib/effect-query";
import { getMenuItemCardsSvc } from "#/modules/menu";
import { menuReadScope } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { ShowMenuItemsInput, ShowMenuItemsResult } from "./schema";

// -----
// Only ids on this Tenant's menu survive;
// made-up or foreign ids drop. Priced in the
// Country in play, and items not sold there
// drop too. With several Countries and none in
// play the cards carry no price.
// -----
export const showMenuItems = async (
  { ids, countryId }: ShowMenuItemsInput,
  runtime: ChatBotRuntime,
): Promise<ShowMenuItemsResult> => {
  const scope = await menuReadScope({ countryId }, runtime);
  return {
    items: await runEffect(
      getMenuItemCardsSvc(runtime.db, runtime.owner.tenantId, ids, scope.locationId, scope.countryId),
    ),
  };
};
