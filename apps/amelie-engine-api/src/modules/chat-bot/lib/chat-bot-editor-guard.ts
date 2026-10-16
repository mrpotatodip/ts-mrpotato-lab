import { Effect } from "effect";
import { hasAccessPower } from "@repo/contracts/amelie";
import { Forbidden, runEffect, type AppFailure, type DbError, type NotFound } from "#/lib/effect-query";
import { getTenantSvc } from "#/modules/tenant";
import { CHAT_BOT_EDITOR_ONLY } from "#/modules/chat-bot/constants";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

export const requireChatBotPower = (
  { db, owner }: ChatBotRuntime,
  power: string,
): Effect.Effect<void, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    if (owner.kind !== "user") return yield* new Forbidden({ message: CHAT_BOT_EDITOR_ONLY });
    const tenant = yield* getTenantSvc(db, owner.userId, owner.tenantId);
    if (!hasAccessPower(tenant.powers, power)) {
      return yield* new Forbidden({ message: CHAT_BOT_EDITOR_ONLY });
    }
  });

export const runAsChatBotEditor = <A>(
  runtime: ChatBotRuntime,
  change: Effect.Effect<A, AppFailure>,
  power: string,
): Promise<A> => runEffect(requireChatBotPower(runtime, power).pipe(Effect.andThen(change)));
