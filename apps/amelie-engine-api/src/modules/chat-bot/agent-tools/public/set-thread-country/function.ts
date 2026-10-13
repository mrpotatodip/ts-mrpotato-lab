import { Effect } from "effect";
import { Invalid, runEffect } from "#/lib/effect-query";
import { resolveCountryRefSvc } from "#/modules/country";
import { CHAT_BOT_NO_THREAD_FOR_COUNTRY } from "#/modules/chat-bot/constants";
import { setChatBotThreadCountryEffect } from "#/modules/chat-bot/queries";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { SetThreadCountryInput, SetThreadCountryResult } from "./schema";

// -----
// The Tenant and the Thread come from the
// server; the named Country must be one of the
// Tenant's open ones. A bad value changes
// nothing and the error lists the valid ones.
// -----
export const setThreadCountry = (
  { country }: SetThreadCountryInput,
  runtime: ChatBotRuntime,
): Promise<SetThreadCountryResult> =>
  runEffect(
    Effect.gen(function* () {
      const { threadId } = runtime;
      if (threadId === undefined) return yield* new Invalid({ message: CHAT_BOT_NO_THREAD_FOR_COUNTRY });
      const found = yield* resolveCountryRefSvc(runtime.db, runtime.owner.tenantId, country);
      yield* setChatBotThreadCountryEffect(runtime.db, runtime.owner, threadId, found.id);
      return { country: { id: found.id, name: found.name, code: found.code } };
    }),
  );
