import { SCHEDULE_WEEKDAYS, setBusinessHoursSvc } from "#/modules/schedule";
import { answerNeedsLocation, runAsBoundChatBotEditor } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetBusinessHoursInput, SetBusinessHoursResult } from "./schema";

export const setBusinessHours = async (
  { weekday, locationId, ...hours }: SetBusinessHoursInput,
  runtime: ChatBotRuntime,
): Promise<SetBusinessHoursResult | LocationNeededResult> =>
  runAsBoundChatBotEditor(runtime, "store:hours:weekly:update", locationId, (target) =>
    answerNeedsLocation(
      setBusinessHoursSvc(
        runtime.db,
        runtime.owner.tenantId,
        { dayOfWeek: SCHEDULE_WEEKDAYS.indexOf(weekday), ...hours },
        target.locationId,
        target.coverage,
      ),
    ),
  );
