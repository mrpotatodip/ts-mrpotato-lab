import { Effect } from "effect";
import { Forbidden, runEffect, type AppFailure, type DbError, type NotFound } from "#/lib/effect-query";
import { getTenantSvc } from "#/modules/tenant";
import { CHAT_BOT_EDITOR_ONLY } from "#/modules/chat-bot/constants";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";

// -----
// Every admin tool runs this first. The Role's
// can_edit flag is read fresh, never from the model.
// -----
export const requireChatBotEditor = ({
  db,
  owner,
}: ChatBotRuntime): Effect.Effect<void, DbError | NotFound | Forbidden> =>
  Effect.gen(function* () {
    if (owner.kind !== "user") return yield* new Forbidden({ message: CHAT_BOT_EDITOR_ONLY });
    const tenant = yield* getTenantSvc(db, owner.userId, owner.tenantId);
    if (!tenant.canEdit) {
      return yield* new Forbidden({ message: CHAT_BOT_EDITOR_ONLY });
    }
  });

// -----
// What every admin tool does: check the role,
// then run the change and hand back its result.
// -----
export const runAsChatBotEditor = <A>(
  runtime: ChatBotRuntime,
  change: Effect.Effect<A, AppFailure>,
): Promise<A> => runEffect(requireChatBotEditor(runtime).pipe(Effect.andThen(change)));
