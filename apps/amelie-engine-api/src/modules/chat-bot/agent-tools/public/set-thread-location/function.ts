import { Effect } from "effect";
import { Invalid, runEffect } from "#/lib/effect-query";
import { resolveLocationRefSvc } from "#/modules/location";
import { CHAT_BOT_NO_THREAD_FOR_LOCATION } from "#/modules/chat-bot/constants";
import { setChatBotThreadLocationEffect } from "#/modules/chat-bot/queries";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetThreadLocationInput, SetThreadLocationResult } from "./schema";

// -----
// The Tenant and the Thread come from the
// server; the named Location must be one of the
// Tenant's active ones.
// -----
export const setThreadLocation = (
  { location }: SetThreadLocationInput,
  runtime: ChatBotRuntime,
): Promise<SetThreadLocationResult> =>
  runEffect(
    Effect.gen(function* () {
      const { threadId } = runtime;
      if (threadId === undefined) return yield* new Invalid({ message: CHAT_BOT_NO_THREAD_FOR_LOCATION });
      const found = yield* resolveLocationRefSvc(runtime.db, runtime.owner.tenantId, location);
      yield* setChatBotThreadLocationEffect(runtime.db, runtime.owner, threadId, found.id);
      return { location: { id: found.id, name: found.name } };
    }),
  );
