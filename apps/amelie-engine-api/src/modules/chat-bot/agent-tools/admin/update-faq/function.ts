import { Effect } from "effect";
import { updateFaqSvc } from "#/modules/faq";
import { resolveFaqScope, runAsChatBotEditor } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { FaqResult, FaqScopeNeededResult } from "#/modules/chat-bot/schemas";
import type { UpdateFaqInput } from "./schema";

// -----
// null means "keep it", so only the parts the model
// passed are written. No scope keeps the FAQ's; "all"
// moves it to every Location; a scope that names
// nothing valid writes nothing and returns the choices.
// -----
export const updateFaq = (
  { faqId, question, answer, scope }: UpdateFaqInput,
  runtime: ChatBotRuntime,
): Promise<FaqResult | FaqScopeNeededResult> =>
  runAsChatBotEditor(
    runtime,
    Effect.gen(function* () {
      const tenantId = runtime.owner.tenantId;
      const resolved = scope?.trim() ? yield* resolveFaqScope(runtime.db, tenantId, scope) : undefined;
      if (resolved && "needsScope" in resolved) return resolved;
      const chosen = resolved ?? {};
      return yield* updateFaqSvc(runtime.db, tenantId, faqId, {
        ...(question !== null && { question }),
        ...(answer !== null && { answer }),
        ...chosen,
      });
    }),
    "company:faqs:faqs:update",
  );
