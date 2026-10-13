import { removeHoursOverrideSvc } from "#/modules/schedule";
import { answerNeedsLocation, resolveToolLocation, runAsChatBotEditor, toIgnoredLocationResult } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { RemoveHoursOverrideInput, RemoveHoursOverrideResult } from "./schema";

export const removeHoursOverride = async (
  { date, locationId }: RemoveHoursOverrideInput,
  runtime: ChatBotRuntime,
): Promise<RemoveHoursOverrideResult | LocationNeededResult> => {
  const { locationId: chosenLocationId, ignored } = await resolveToolLocation(locationId, runtime);
  if (ignored) return toIgnoredLocationResult(ignored);
  return runAsChatBotEditor(
    runtime,
    answerNeedsLocation(
      removeHoursOverrideSvc(runtime.db, runtime.owner.tenantId, date, chosenLocationId),
    ),
  );
};
