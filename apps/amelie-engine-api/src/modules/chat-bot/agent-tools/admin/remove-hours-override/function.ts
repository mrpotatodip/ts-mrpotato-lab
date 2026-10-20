import { removeHoursOverrideSvc } from "#/modules/schedule";
import { answerNeedsLocation, runAsBoundChatBotEditor } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { RemoveHoursOverrideInput, RemoveHoursOverrideResult } from "./schema";

export const removeHoursOverride = async (
  { date, locationId }: RemoveHoursOverrideInput,
  runtime: ChatBotRuntime,
): Promise<RemoveHoursOverrideResult | LocationNeededResult> =>
  runAsBoundChatBotEditor(runtime, "store:hours:overrides:delete", locationId, (target) =>
    answerNeedsLocation(
      removeHoursOverrideSvc(runtime.db, runtime.owner.tenantId, date, target.locationId, target.coverage),
    ),
  );
