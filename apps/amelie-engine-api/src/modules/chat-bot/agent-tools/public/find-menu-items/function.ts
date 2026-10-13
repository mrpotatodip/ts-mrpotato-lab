import { runEffect } from "#/lib/effect-query";
import { searchMenuSvc } from "#/modules/menu";
import { menuReadScope } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { FindMenuItemsInput, FindMenuItemsResult } from "./schema";

export const findMenuItems = async (
  { locationId, countryId, ...search }: FindMenuItemsInput,
  runtime: ChatBotRuntime,
): Promise<FindMenuItemsResult> => {
  const scope = await menuReadScope({ locationId, countryId }, runtime);
  return {
    location: scope.location,
    country: scope.country,
    note: scope.note,
    items: await runEffect(
      searchMenuSvc(
        runtime.db,
        runtime.owner.tenantId,
        search,
        scope.locationId,
        scope.countryId,
        runtime.owner.kind === "user",
      ),
    ),
  };
};
