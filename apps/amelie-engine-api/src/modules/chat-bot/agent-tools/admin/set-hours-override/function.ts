import { setHoursOverrideSvc } from "#/modules/schedule";
import { answerNeedsLocation, resolveToolLocation, runAsChatBotEditor, toIgnoredLocationResult } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetHoursOverrideInput, SetHoursOverrideResult } from "./schema";

export const setHoursOverride = async (
  { locationId, ...override }: SetHoursOverrideInput,
  runtime: ChatBotRuntime,
): Promise<SetHoursOverrideResult | LocationNeededResult> => {
  const { locationId: chosenLocationId, ignored } = await resolveToolLocation(locationId, runtime);
  if (ignored) return toIgnoredLocationResult(ignored);
  return runAsChatBotEditor(
    runtime,
    answerNeedsLocation(
      setHoursOverrideSvc(runtime.db, runtime.owner.tenantId, override, chosenLocationId),
    ),
  );
};
