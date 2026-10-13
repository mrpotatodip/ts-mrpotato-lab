import { Effect } from "effect";
import type { DbError } from "#/lib/effect-query";
import { listOpenCountryRefsEffect, matchCountryRef } from "#/modules/country";
import { listActiveLocationRefsEffect, matchLocationRef } from "#/modules/location";
import { CHAT_BOT_FAQ_ALL_SCOPE, CHAT_BOT_FAQ_SCOPE_NOT_FOUND } from "#/modules/chat-bot/constants";
import type { FaqScopeNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

// -----
// Where an FAQ the model writes applies. Never a
// guess: "all" (or nothing) is every Location, else
// the model's value must strictly match one of the
// Tenant's open Countries (id, code or name) or active
// Locations (id, slug or name). Anything else (made up,
// archived, another cafe's) writes nothing and the
// valid choices come back to ask about.
// -----
export const resolveFaqScope = (
  db: ChatBotRuntime["db"],
  tenantId: string,
  requested: string | null | undefined,
): Effect.Effect<{ countryId: string | null; locationId: string | null } | FaqScopeNeededResult, DbError> =>
  Effect.gen(function* () {
    const ref = requested?.trim();
    if (!ref || ref.toLowerCase() === CHAT_BOT_FAQ_ALL_SCOPE) return { countryId: null, locationId: null };
    const countries = yield* listOpenCountryRefsEffect(db, tenantId);
    const country = matchCountryRef(countries, ref);
    if (country) return { countryId: country.id, locationId: null };
    const locations = yield* listActiveLocationRefsEffect(db, tenantId);
    const location = matchLocationRef(locations, ref);
    if (location) return { countryId: null, locationId: location.id };
    const countryChoices = countries.map(({ id, name, code }) => ({ id, name, code }));
    const locationChoices = locations.map(({ id, name }) => ({ id, name }));
    const names = [
      ...countryChoices.map((choice) => `${choice.name} (${choice.code}, all its locations)`),
      ...locationChoices.map((choice) => choice.name),
    ].join(", ");
    return {
      needsScope: true as const,
      message: CHAT_BOT_FAQ_SCOPE_NOT_FOUND(ref, names),
      countries: countryChoices,
      locations: locationChoices,
    };
  });
