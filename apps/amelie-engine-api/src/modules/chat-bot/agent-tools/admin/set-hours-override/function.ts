import { setHoursOverrideSvc } from "#/modules/schedule";
import { answerNeedsLocation, runAsBoundChatBotEditor } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetHoursOverrideInput, SetHoursOverrideResult } from "./schema";

export const setHoursOverride = async (
  { locationId, ...override }: SetHoursOverrideInput,
  runtime: ChatBotRuntime,
): Promise<SetHoursOverrideResult | LocationNeededResult> =>
  runAsBoundChatBotEditor(runtime, "store:hours:overrides:update", locationId, (target) =>
    answerNeedsLocation(
      setHoursOverrideSvc(runtime.db, runtime.owner.tenantId, override, target.locationId, target.coverage),
    ),
  );
