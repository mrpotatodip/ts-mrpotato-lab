import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { getBusinessProfileSvc, tenantProfileForCountrySvc } from "#/modules/business-profile";
import { findChatBotThreadCountryIdEffect } from "#/modules/chat-bot/queries";
import { listOpenCountryRefsEffect, readCountryIdEffect, type CountryRef } from "#/modules/country";
import { resolveLocationSvc } from "#/modules/location";
import { joinToolNotes, resolveToolLocation, toCountryNarrowedFailure, toLocationNeededResult } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { BusinessProfileNeedsLocationResult, BusinessProfileReadResult } from "#/modules/chat-bot/schemas";
import type { GetBusinessProfileInput } from "./schema";

const toPlaceCountry = (open: CountryRef[], countryId: string | null) => {
  const found = countryId ? open.find((country) => country.id === countryId) : undefined;
  return found ? { id: found.id, name: found.name, code: found.code } : null;
};

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
  const { db } = runtime;
  const tenantId = runtime.owner.tenantId;
  const open = await runEffect(listOpenCountryRefsEffect(db, tenantId));
  const countryIdForProfile = async (): Promise<string | null> => {
    if (locationId) return runEffect(readCountryIdEffect(db, tenantId, locationId));
    const fromCountryList = countryLocations?.[0]?.id;
    if (fromCountryList) return runEffect(readCountryIdEffect(db, tenantId, fromCountryList));
    if (runtime.threadId === undefined) return null;
    return runEffect(findChatBotThreadCountryIdEffect(db, runtime.threadId));
  };
  return runEffect(
    getBusinessProfileSvc(db, tenantId, locationId).pipe(
      Effect.flatMap((profile) =>
        resolveLocationSvc(db, tenantId, locationId).pipe(
          Effect.flatMap((location) =>
            readCountryIdEffect(db, tenantId, location.id).pipe(
              Effect.map((countryId) => ({
                ...profile,
                note,
                location: { id: location.id, name: location.name },
                country: toPlaceCountry(open, countryId),
              })),
            ),
          ),
        ),
      ),
      Effect.catchTag("NeedsLocation", (failure) =>
        Effect.promise(countryIdForProfile).pipe(
          Effect.flatMap((countryId) =>
            tenantProfileForCountrySvc(db, tenantId, countryId).pipe(
              Effect.map((profile) => ({
                ...profile,
                address: null,
                phone: null,
                ...toLocationNeededResult(toCountryNarrowedFailure(failure, countryLocations)),
                note,
                message: joinToolNotes(note, failure.message) ?? failure.message,
                location: null,
                country: toPlaceCountry(open, countryId),
              })),
            ),
          ),
        ),
      ),
    ),
  );
};
