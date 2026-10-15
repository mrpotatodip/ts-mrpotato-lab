import { Effect } from "effect";
import { NeedsLocation, runEffect } from "#/lib/effect-query";
import {
  listActiveLocationRefsEffect,
  listActiveLocationsInCountryEffect,
  matchLocationRef,
  resolveReadLocationSvc,
  type LocationOption,
} from "#/modules/location";
import { CHAT_BOT_ASK_LOCATION, CHAT_BOT_LOCATION_REF_IGNORED } from "#/modules/chat-bot/constants";
import { findChatBotThreadCountryIdEffect, findChatBotThreadLocationIdEffect } from "#/modules/chat-bot/queries";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime, IgnoredLocationRef, ToolLocation } from "#/modules/chat-bot/types";

// -----
// A tool that needs a Location answers with the
// options instead of failing, so the model can
// ask the customer which one.
// -----
export const toLocationNeededResult = (failure: NeedsLocation): LocationNeededResult => ({
  needsLocation: true,
  message: CHAT_BOT_ASK_LOCATION(failure.locations.map((location) => location.name).join(", ")),
  locations: failure.locations,
});

// -----
// When the Thread's Country is known, only its
// Locations are worth asking about.
// -----
export const toCountryNarrowedFailure = (
  failure: NeedsLocation,
  countryLocations: ToolLocation["countryLocations"],
): NeedsLocation =>
  countryLocations === null ? failure : new NeedsLocation({ message: failure.message, locations: countryLocations });

export const answerNeedsLocation = <A, E>(
  effect: Effect.Effect<A, E | NeedsLocation>,
  countryLocations: ToolLocation["countryLocations"] = null,
): Effect.Effect<A | LocationNeededResult, E> => {
  const answered = Effect.catchIf(
    effect,
    (failure): failure is NeedsLocation => failure instanceof NeedsLocation,
    (failure) => Effect.succeed(toLocationNeededResult(toCountryNarrowedFailure(failure, countryLocations))),
  );
  // SAFETY: catchIf removes exactly NeedsLocation from the failures.
  return answered as Effect.Effect<A | LocationNeededResult, E>;
};

// -----
// The model's locationId is an override: an id,
// slug or name of one of the Tenant's active
// Locations. A value that matches none is
// ignored and said so, never failed on. Without
// one, the Thread's Location is used, read fresh
// because the assistant can change it mid-chat.
// A read about one place (hours, address) can ask
// for viaCountry: with no Location, the Thread's
// Country with exactly one active Location resolves
// it silently; with several, they are the options.
// -----
export const resolveToolLocation = async (
  requested: string | null | undefined,
  runtime: ChatBotRuntime,
  options: { viaCountry?: boolean } = {},
): Promise<ToolLocation> => {
  const ref = requested?.trim();
  if (ref) {
    const active = await runEffect(listActiveLocationRefsEffect(runtime.db, runtime.owner.tenantId));
    const found = matchLocationRef(active, ref);
    if (found) return { locationId: found.id, ignored: null, countryLocations: null };
    const choices = active.map(({ id, name }) => ({ id, name }));
    const names = choices.map((choice) => choice.name).join(", ");
    return {
      ...(await threadLocation(runtime, options)),
      ignored: { note: CHAT_BOT_LOCATION_REF_IGNORED(ref, names), options: choices },
    };
  }
  return { ...(await threadLocation(runtime, options)), ignored: null };
};

const threadLocation = async (
  runtime: ChatBotRuntime,
  { viaCountry }: { viaCountry?: boolean },
): Promise<Pick<ToolLocation, "locationId" | "countryLocations">> => {
  const locationId = await threadLocationId(runtime);
  if (locationId !== undefined || !viaCountry || runtime.threadId === undefined) {
    return { locationId, countryLocations: null };
  }
  const countryId = await runEffect(findChatBotThreadCountryIdEffect(runtime.db, runtime.threadId));
  if (countryId === null) return { locationId: undefined, countryLocations: null };
  const inCountry = await runEffect(listActiveLocationsInCountryEffect(runtime.db, runtime.owner.tenantId, countryId));
  if (inCountry.length === 1) return { locationId: inCountry[0].id, countryLocations: null };
  return { locationId: undefined, countryLocations: inCountry.length > 1 ? inCountry : null };
};

const threadLocationId = async (runtime: ChatBotRuntime): Promise<string | undefined> => {
  if (runtime.threadId === undefined) return undefined;
  const stored = await runEffect(findChatBotThreadLocationIdEffect(runtime.db, runtime.threadId));
  return stored ?? undefined;
};

// -----
// For menu and FAQ reads, which still make sense
// without a Location: the one in play, or null
// when the Tenant has several and none is set.
// -----
export const locationForRead = async (
  requested: string | null | undefined,
  runtime: ChatBotRuntime,
): Promise<{ location: LocationOption | null; ignoredNote: string | null }> => {
  const { locationId, ignored } = await resolveToolLocation(requested, runtime);
  const location = await runEffect(resolveReadLocationSvc(runtime.db, runtime.owner.tenantId, locationId));
  return { location, ignoredNote: ignored?.note ?? null };
};

export const joinToolNotes = (...notes: Array<string | null>): string | null => {
  const present = notes.filter((note): note is string => note !== null);
  return present.length > 0 ? present.join(" ") : null;
};

// -----
// A write never lands on a guessed Location: when
// the model's value matched none, answer with the
// options instead.
// -----
export const toIgnoredLocationResult = (ignored: IgnoredLocationRef): LocationNeededResult => ({
  needsLocation: true,
  message: `${ignored.note} Ask which location, then call setThreadLocation.`,
  locations: ignored.options,
});
