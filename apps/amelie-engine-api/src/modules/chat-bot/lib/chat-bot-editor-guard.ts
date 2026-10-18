import { Effect } from "effect";
import {
  covers,
  hasAccessPower,
  type AccessPower,
  type BoundPower,
  type Coverage,
  type UnboundPower,
} from "@repo/contracts/amelie";
import { Forbidden, runEffect, type AppFailure, type DbError, type NotFound } from "#/lib/effect-query";
import { getTenantSvc } from "#/modules/tenant";
import { TENANT_LOCATION_NOT_COVERED, TENANT_LOCATIONS_NOT_COVERED } from "#/modules/tenant/constants";
import { CHAT_BOT_EDITOR_ONLY } from "#/modules/chat-bot/constants";
import { resolveToolLocation, toIgnoredLocationResult } from "#/modules/chat-bot/lib/chat-bot-location-needed";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

// -----
// The member's coverage, from the one Tenant lookup the
// routes use. Anyone but a signed-in member who holds the
// Power is refused.
// -----
const loadEditorCoverage = (
  { db, owner }: ChatBotRuntime,
  power: AccessPower,
): Effect.Effect<Coverage, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    if (owner.kind !== "user") return yield* new Forbidden({ message: CHAT_BOT_EDITOR_ONLY });
    const tenant = yield* getTenantSvc(db, owner.userId, owner.tenantId);
    if (!hasAccessPower(tenant.powers, power)) {
      return yield* new Forbidden({ message: CHAT_BOT_EDITOR_ONLY });
    }
    return tenant.coverage;
  });

// -----
// For Powers no binding limits. A bound Power does not
// compile here: use requireBoundChatBotPower.
// -----
export const requireChatBotPower = (
  runtime: ChatBotRuntime,
  power: UnboundPower,
): Effect.Effect<void, DbError | NotFound | Forbidden> => Effect.asVoid(loadEditorCoverage(runtime, power));

// -----
// The member must cover every Location the tool names; a
// member who covers nothing is refused outright.
// -----
const refuseUncovered = (coverage: Coverage, locationIds: readonly string[]): Effect.Effect<void, Forbidden> => {
  if (Array.isArray(coverage) && coverage.length === 0) {
    return Effect.fail(new Forbidden({ message: TENANT_LOCATION_NOT_COVERED }));
  }
  const uncovered = locationIds.filter((id) => !covers(coverage, [id]));
  if (uncovered.length === 0) return Effect.void;
  return Effect.fail(
    new Forbidden({
      message: locationIds.length === 1 ? TENANT_LOCATION_NOT_COVERED : TENANT_LOCATIONS_NOT_COVERED(uncovered),
    }),
  );
};

// -----
// For Powers a binding limits, the assistant's twin of
// requireBoundPower. Yields the coverage so the tool
// resolves an omitted Location over it.
// -----
export const requireBoundChatBotPower = (
  runtime: ChatBotRuntime,
  power: BoundPower,
  locationIds: readonly string[],
): Effect.Effect<Coverage, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    const coverage = yield* loadEditorCoverage(runtime, power);
    yield* refuseUncovered(coverage, locationIds);
    return coverage;
  });

export const runAsChatBotEditor = <A>(
  runtime: ChatBotRuntime,
  change: Effect.Effect<A, AppFailure>,
  power: UnboundPower,
): Promise<A> => runEffect(requireChatBotPower(runtime, power).pipe(Effect.andThen(change)));

// -----
// For a bound Power whose Locations the change finds only
// after loading them (a FAQ's scope, a Country's open
// Locations): checks the Power, then hands the coverage to
// the change, whose service refuses what it does not cover.
// A member who covers nothing is refused outright, as in
// requireBoundPower.
// -----
export const runAsCoveredChatBotEditor = <A>(
  runtime: ChatBotRuntime,
  power: BoundPower,
  change: (coverage: Coverage) => Effect.Effect<A, AppFailure>,
): Promise<A> => runEffect(requireBoundChatBotPower(runtime, power, []).pipe(Effect.flatMap(change)));

// -----
// The bound tools' flow, one Tenant lookup: check the
// Power and load the coverage, resolve the Location the
// model named over it, refuse an uncovered one, then run
// the change with the coverage so an omitted Location
// defaults among the covered ones. A name that matched
// nothing answers with the covered options instead.
// -----
export const runAsBoundChatBotEditor = async <A>(
  runtime: ChatBotRuntime,
  power: BoundPower,
  requested: string | null | undefined,
  change: (target: { locationId: string | undefined; coverage: Coverage }) => Effect.Effect<A, AppFailure>,
): Promise<A | LocationNeededResult> => {
  const coverage = await runEffect(requireBoundChatBotPower(runtime, power, []));
  const { locationId, ignored } = await resolveToolLocation(requested, runtime, { coverage });
  if (ignored) return toIgnoredLocationResult(ignored);
  return runEffect(
    refuseUncovered(coverage, locationId === undefined ? [] : [locationId]).pipe(
      Effect.andThen(change({ locationId, coverage })),
    ),
  );
};
