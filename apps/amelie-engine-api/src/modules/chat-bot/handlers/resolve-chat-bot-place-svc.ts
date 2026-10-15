import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, type DbError, type NotFound } from "#/lib/effect-query";
import { readCountryIdEffect, resolveCountryRefSvc } from "#/modules/country";
import { resolveLocationRefSvc } from "#/modules/location";
import { CHAT_BOT_COUNTRY_LOCATION_MISMATCH } from "#/modules/chat-bot/constants";

export type ChatBotPlaceInput = {
  threadId?: string;
  location?: string;
  country?: string;
};

export type ChatBotPlace = {
  locationId: string | null;
  countryId: string | null;
};

export const resolveChatBotPlaceSvc = (
  db: DbConnectType,
  tenantId: string,
  input: ChatBotPlaceInput,
): Effect.Effect<ChatBotPlace, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    if (input.threadId !== undefined) return { locationId: null, countryId: null };
    const location =
      input.location !== undefined ? yield* resolveLocationRefSvc(db, tenantId, input.location) : null;
    const country =
      input.country !== undefined ? yield* resolveCountryRefSvc(db, tenantId, input.country) : null;
    if (location && country) {
      const locationCountryId = yield* readCountryIdEffect(db, tenantId, location.id);
      if (locationCountryId !== country.id) {
        return yield* new Invalid({ message: CHAT_BOT_COUNTRY_LOCATION_MISMATCH });
      }
    }
    return { locationId: location?.id ?? null, countryId: country?.id ?? null };
  });
