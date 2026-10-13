import { Effect } from "effect";
import type { FaqScope } from "#/modules/faq";
import { NotFound, runEffect, type DbError } from "#/lib/effect-query";
import {
  listOpenCountryRefsEffect,
  matchCountryRef,
  readCountryIdEffect,
  resolveCountryRefSvc,
  type CountryRef,
} from "#/modules/country";
import type { LocationOption } from "#/modules/location";
import {
  CHAT_BOT_COUNTRY_REF_IGNORED,
  CHAT_BOT_FAQS_COUNTRY_NOTE,
  CHAT_BOT_FAQS_TENANT_WIDE_NOTE,
  CHAT_BOT_MENU_ASK_LOCATION_NOTE,
  CHAT_BOT_MENU_TENANT_WIDE_NOTE,
  CHAT_BOT_PRICE_ASK_COUNTRY,
  CHAT_BOT_PRICE_COUNTRY_NOT_FOUND,
} from "#/modules/chat-bot/constants";
import type { CountryNeededResult } from "#/modules/chat-bot/schemas";
import { findChatBotThreadCountryIdEffect } from "#/modules/chat-bot/queries";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import { joinToolNotes, locationForRead } from "./chat-bot-location-needed";

export type MenuReadScope = {
  location: LocationOption | null;
  country: CountryRef | null;
  note: string | null;
  locationId: string | undefined;
  countryId: string | undefined;
};

// -----
// The Country a menu read is about, in this order: the
// model's countryId, a Location the model named (its
// Country), the Thread's Country, the Thread's Location's
// Country, the Tenant's only open Country. A countryId that
// matches no open Country is ignored and said so, never
// failed on.
// With several open Countries and none in play there is
// no Country: names and availability come back without
// prices, and the note tells the assistant to ask which
// location before quoting one (ADR-0002). MCP callers
// have no Thread, so they get the same rule.
// A Location in another Country than the one in play is
// left out, so the menu is that Country's.
// -----
const readScope = async (input: { locationId?: string | null; countryId?: string | null }, runtime: ChatBotRuntime) => {
  const { db } = runtime;
  const tenantId = runtime.owner.tenantId;
  const { location, ignoredNote } = await locationForRead(input.locationId, runtime);
  const open = await runEffect(listOpenCountryRefsEffect(db, tenantId));

  const ref = input.countryId?.trim();
  const named = ref ? matchCountryRef(open, ref) : undefined;
  const countryNote =
    ref && !named
      ? CHAT_BOT_COUNTRY_REF_IGNORED(ref, open.map((country) => `${country.name} (${country.code})`).join(", "))
      : null;

  const locationCountryId = location ? await runEffect(readCountryIdEffect(db, tenantId, location.id)) : null;
  const locationNamed = Boolean(input.locationId?.trim()) && ignoredNote === null && location !== null;
  const threadCountryId =
    runtime.threadId === undefined ? null : await runEffect(findChatBotThreadCountryIdEffect(db, runtime.threadId));
  const only = open.length === 1 ? open[0].id : null;
  const inPlayId =
    named?.id ?? (locationNamed ? locationCountryId : null) ?? threadCountryId ?? locationCountryId ?? only;
  const country: CountryRef | null = open.find((candidate) => candidate.id === inPlayId) ?? null;

  const kept = location && (locationCountryId === null || locationCountryId === country?.id) ? location : null;
  return { kept, country, open, ignoredNote, countryNote };
};

export const menuReadScope = async (
  input: { locationId?: string | null; countryId?: string | null },
  runtime: ChatBotRuntime,
): Promise<MenuReadScope> => {
  const { kept, country, open, ignoredNote, countryNote } = await readScope(input, runtime);
  const askLocation = country === null && open.length > 1;
  return {
    location: kept,
    country,
    note: joinToolNotes(
      ignoredNote,
      countryNote,
      kept ? null : CHAT_BOT_MENU_TENANT_WIDE_NOTE,
      askLocation ? CHAT_BOT_MENU_ASK_LOCATION_NOTE : null,
    ),
    locationId: kept?.id,
    countryId: kept || !country || open.length < 2 ? undefined : country.id,
  };
};

// -----
// What an FAQ read covers, with the Country in play as
// for the menu: a Location (its own, its Country's and
// the cafe-wide FAQs), else a Country (its and the
// cafe-wide ones), else only the cafe-wide ones. A one
// Country cafe keeps the Location rule as it was.
// -----
export type FaqReadScope = {
  location: LocationOption | null;
  country: { id: string; name: string } | null;
  note: string | null;
  scope: FaqScope;
};

export const faqReadScope = async (
  input: { locationId?: string | null },
  runtime: ChatBotRuntime,
): Promise<FaqReadScope> => {
  const { kept, country, open, ignoredNote } = await readScope(input, runtime);
  if (kept) return { location: kept, country: null, note: ignoredNote, scope: { kind: "location", locationId: kept.id } };
  if (country && open.length > 1) {
    return {
      location: null,
      country: { id: country.id, name: country.name },
      note: joinToolNotes(ignoredNote, CHAT_BOT_FAQS_COUNTRY_NOTE(country.name)),
      scope: { kind: "country", countryId: country.id },
    };
  }
  return {
    location: null,
    country: null,
    note: joinToolNotes(ignoredNote, CHAT_BOT_FAQS_TENANT_WIDE_NOTE),
    scope: country ? { kind: "country", countryId: country.id } : { kind: "tenantWide" },
  };
};

// -----
// The Country a price write is about. Never a guess,
// and never the Thread's (the admin chat has none): the
// model's value (strict match against the open
// Countries), else the Tenant's only open Country. With
// several and none named, or a value that matches none
// (archived, another cafe's, made up), nothing is
// written and the open Countries come back to choose
// from.
// -----
export const resolveWriteCountry = (
  db: ChatBotRuntime["db"],
  tenantId: string,
  requested: string | null | undefined,
): Effect.Effect<{ countryId: string | undefined } | CountryNeededResult, DbError> =>
  Effect.gen(function* () {
    const ref = requested?.trim();
    const open = yield* listOpenCountryRefsEffect(db, tenantId);
    const choices = open.map(({ id, name, code }) => ({ id, name, code }));
    const names = open.map((country) => `${country.name} (${country.code})`).join(", ");
    if (!ref) {
      if (open.length > 1) {
        return { needsCountry: true as const, message: CHAT_BOT_PRICE_ASK_COUNTRY(names), countries: choices };
      }
      return { countryId: open[0]?.id };
    }
    return yield* resolveCountryRefSvc(db, tenantId, ref).pipe(
      Effect.map((found) => ({ countryId: found.id })),
      Effect.catchIf(
        (failure): failure is NotFound => failure instanceof NotFound,
        () =>
          Effect.succeed({
            needsCountry: true as const,
            message: CHAT_BOT_PRICE_COUNTRY_NOT_FOUND(ref, names),
            countries: choices,
          }),
      ),
    );
  });
