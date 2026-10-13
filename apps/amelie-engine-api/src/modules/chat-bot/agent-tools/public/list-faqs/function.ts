import { runEffect } from "#/lib/effect-query";
import { listFaqsSvc } from "#/modules/faq";
import { faqReadScope } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { ListFaqsInput, ListFaqsResult } from "./schema";

export const listFaqs = async (input: ListFaqsInput, runtime: ChatBotRuntime): Promise<ListFaqsResult> => {
  const { location, country, note, scope } = await faqReadScope(input, runtime);
  return {
    location,
    country,
    note,
    ...(await runEffect(listFaqsSvc(runtime.db, runtime.owner.tenantId, scope))),
  };
};
