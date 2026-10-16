import { SCHEDULE_WEEKDAYS, setBusinessHoursSvc } from "#/modules/schedule";
import { answerNeedsLocation, resolveToolLocation, runAsChatBotEditor, toIgnoredLocationResult } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetBusinessHoursInput, SetBusinessHoursResult } from "./schema";

export const setBusinessHours = async (
  { weekday, locationId, ...hours }: SetBusinessHoursInput,
  runtime: ChatBotRuntime,
): Promise<SetBusinessHoursResult | LocationNeededResult> => {
  const { locationId: chosenLocationId, ignored } = await resolveToolLocation(locationId, runtime);
  if (ignored) return toIgnoredLocationResult(ignored);
  return runAsChatBotEditor(
    runtime,
    answerNeedsLocation(
      setBusinessHoursSvc(
        runtime.db,
        runtime.owner.tenantId,
        { dayOfWeek: SCHEDULE_WEEKDAYS.indexOf(weekday), ...hours },
        chosenLocationId,
      ),
    ),
    "store:hours:weekly:update",
  );
};
