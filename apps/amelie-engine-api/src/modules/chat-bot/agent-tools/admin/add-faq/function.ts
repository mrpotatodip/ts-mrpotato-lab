import { Effect } from "effect";
import { addFaqSvc } from "#/modules/faq";
import { resolveFaqScope, runAsCoveredChatBotEditor } from "#/modules/chat-bot/lib";
import type { FaqResult, FaqScopeNeededResult } from "#/modules/chat-bot/schemas";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { AddFaqInput } from "./schema";

// -----
// The FAQ applies to every Location unless the scope
// names a Country or a Location. A scope that names
// nothing valid writes nothing and returns the choices.
// -----
export const addFaq = (
  { scope, ...faq }: AddFaqInput,
  runtime: ChatBotRuntime,
): Promise<FaqResult | FaqScopeNeededResult> =>
  runAsCoveredChatBotEditor(runtime, "company:faqs:faqs:create", (coverage) =>
    Effect.gen(function* () {
      const tenantId = runtime.owner.tenantId;
      const chosen = yield* resolveFaqScope(runtime.db, tenantId, scope);
      if ("needsScope" in chosen) return chosen;
      return yield* addFaqSvc(runtime.db, tenantId, { ...faq, ...chosen }, coverage);
    }),
  );
