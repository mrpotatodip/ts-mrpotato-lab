import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { getTenantScheduleSvc } from "#/modules/schedule";
import { answerNeedsLocation, resolveToolLocation } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { GetOpeningScheduleInput, GetOpeningScheduleResult } from "./schema";

// -----
// The Tenant comes from the signed-in owner,
// never from the model. The Location is the
// model's override, else the Thread's, checked
// against the Tenant. An override that matches
// none is ignored and the note says so.
// -----
export const getOpeningSchedule = async (
  input: GetOpeningScheduleInput,
  runtime: ChatBotRuntime,
): Promise<GetOpeningScheduleResult | LocationNeededResult> => {
  const { locationId, ignored, countryLocations } = await resolveToolLocation(input.locationId, runtime, {
    viaCountry: true,
  });
  const answer = await runEffect(
    answerNeedsLocation(
      getTenantScheduleSvc(runtime.db, runtime.owner.tenantId, locationId).pipe(
        Effect.map((schedule) => ({ ...schedule, note: ignored?.note ?? null })),
      ),
      countryLocations,
    ),
  );
  if ("needsLocation" in answer && ignored) {
    return { ...answer, message: `${ignored.note} ${answer.message}` };
  }
  return answer;
};
