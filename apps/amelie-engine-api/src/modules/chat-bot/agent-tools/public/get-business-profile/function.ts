import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { getBusinessProfileSvc, getTenantProfileSvc } from "#/modules/business-profile";
import { joinToolNotes, resolveToolLocation, toCountryNarrowedFailure, toLocationNeededResult } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { BusinessProfileNeedsLocationResult, BusinessProfileReadResult } from "#/modules/chat-bot/schemas";
import type { GetBusinessProfileInput } from "./schema";

// -----
// The Tenant comes from the owner, never the
// model. The Location is the model's override,
// else the Thread's, checked against the Tenant.
// With several and none set, the Tenant-wide
// facts still come back, plus the options.
// -----
export const getBusinessProfile = async (
  input: GetBusinessProfileInput,
  runtime: ChatBotRuntime,
): Promise<BusinessProfileReadResult | BusinessProfileNeedsLocationResult> => {
  const { locationId, ignored, countryLocations } = await resolveToolLocation(input.locationId, runtime, {
    viaCountry: true,
  });
  const note = ignored?.note ?? null;
  const tenantId = runtime.owner.tenantId;
  return runEffect(
    getBusinessProfileSvc(runtime.db, tenantId, locationId).pipe(
      Effect.map((profile) => ({ ...profile, note })),
      Effect.catchTag("NeedsLocation", (failure) =>
        getTenantProfileSvc(runtime.db, tenantId).pipe(
          Effect.map((profile) => ({
            ...profile,
            address: null,
            phone: null,
            ...toLocationNeededResult(toCountryNarrowedFailure(failure, countryLocations)),
            note,
            message: joinToolNotes(note, failure.message) ?? failure.message,
          })),
        ),
      ),
    ),
  );
};
