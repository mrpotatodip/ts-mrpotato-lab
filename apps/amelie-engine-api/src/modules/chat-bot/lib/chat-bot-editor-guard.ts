import { Effect } from "effect";
import {
  hasAccessPower,
  uncoveredLocations,
  type AccessPower,
  type BoundPower,
  type Coverage,
  type UnboundPower,
} from "@repo/contracts/amelie";
import { Forbidden, runEffect, type AppFailure, type DbError, type NotFound } from "#/lib/effect-query";
import {
  getTenantSvc,
  TENANT_ITEM_WIDE_NOT_COVERED,
  TENANT_LOCATION_NOT_COVERED,
  TENANT_LOCATIONS_NOT_COVERED,
} from "#/modules/tenant";
import { CHAT_BOT_EDITOR_ONLY } from "#/modules/chat-bot/constants";
import { resolveToolLocation, toIgnoredLocationResult } from "#/modules/chat-bot/lib";
import type { LocationNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

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

export const requireChatBotPower = (
  runtime: ChatBotRuntime,
  power: UnboundPower,
): Effect.Effect<void, DbError | NotFound | Forbidden> => Effect.asVoid(loadEditorCoverage(runtime, power));

const refuseUncovered = (coverage: Coverage, locationIds: readonly string[]): Effect.Effect<void, Forbidden> => {
  const gap = uncoveredLocations(coverage, locationIds);
  if (!gap) return Effect.void;
  const single = gap.coversNothing || locationIds.length === 1;
  return Effect.fail(
    new Forbidden({ message: single ? TENANT_LOCATION_NOT_COVERED : TENANT_LOCATIONS_NOT_COVERED(gap.uncovered) }),
  );
};

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

export const requireItemWideChatBotPower = (
  runtime: ChatBotRuntime,
  power: BoundPower,
): Effect.Effect<void, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    const coverage = yield* loadEditorCoverage(runtime, power);
    if (coverage !== "all") return yield* new Forbidden({ message: TENANT_ITEM_WIDE_NOT_COVERED });
  });

export const runAsChatBotEditor = <A>(
  runtime: ChatBotRuntime,
  change: Effect.Effect<A, AppFailure>,
  power: UnboundPower,
): Promise<A> => runEffect(requireChatBotPower(runtime, power).pipe(Effect.andThen(change)));

export const runAsCoveredChatBotEditor = <A>(
  runtime: ChatBotRuntime,
  power: BoundPower,
  change: (coverage: Coverage) => Effect.Effect<A, AppFailure>,
): Promise<A> => runEffect(requireBoundChatBotPower(runtime, power, []).pipe(Effect.flatMap(change)));

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
