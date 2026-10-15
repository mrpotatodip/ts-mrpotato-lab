import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { getBusinessProfileSvc, tenantProfileForCountrySvc } from "#/modules/business-profile";
import { findChatBotThreadCountryIdEffect } from "#/modules/chat-bot/queries";
import { readCountryIdEffect } from "#/modules/country";
import { joinToolNotes, resolveToolLocation, toCountryNarrowedFailure, toLocationNeededResult } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { BusinessProfileNeedsLocationResult, BusinessProfileReadResult } from "#/modules/chat-bot/schemas";
import type { GetBusinessProfileInput } from "./schema";

// -----
// The Tenant comes from the owner, never the
// model. The Location is the model's override,
// else the Thread's, checked against the Tenant.
// With several and none set, Tenant-wide email
// and website come back only for the first
// Country, plus the options.
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
  const countryIdForProfile = async (): Promise<string | null> => {
    if (locationId) return runEffect(readCountryIdEffect(runtime.db, tenantId, locationId));
    const fromCountryList = countryLocations?.[0]?.id;
    if (fromCountryList) return runEffect(readCountryIdEffect(runtime.db, tenantId, fromCountryList));
    if (runtime.threadId === undefined) return null;
    return runEffect(findChatBotThreadCountryIdEffect(runtime.db, runtime.threadId));
  };
  return runEffect(
    getBusinessProfileSvc(runtime.db, tenantId, locationId).pipe(
      Effect.map((profile) => ({ ...profile, note })),
      Effect.catchTag("NeedsLocation", (failure) =>
        Effect.promise(countryIdForProfile).pipe(
          Effect.flatMap((countryId) => tenantProfileForCountrySvc(runtime.db, tenantId, countryId)),
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
