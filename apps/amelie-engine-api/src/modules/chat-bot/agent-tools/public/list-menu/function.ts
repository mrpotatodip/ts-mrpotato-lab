import { runEffect } from "#/lib/effect-query";
import { listMenuSvc } from "#/modules/menu";
import { menuReadScope } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { ListMenuInput, ListMenuResult } from "./schema";

// -----
// Priced in the Country in play (the model's, the Thread's,
// its Location's, the Tenant's only). With several Countries
// and none in play: names and availability, no prices.
// -----
export const listMenu = async (input: ListMenuInput, runtime: ChatBotRuntime): Promise<ListMenuResult> => {
  const scope = await menuReadScope(input, runtime);
  return {
    location: scope.location,
    country: scope.country,
    note: scope.note,
    categories: await runEffect(
      listMenuSvc(
        runtime.db,
        runtime.owner.tenantId,
        scope.locationId,
        scope.countryId,
        runtime.owner.kind === "user",
      ),
    ),
  };
};
