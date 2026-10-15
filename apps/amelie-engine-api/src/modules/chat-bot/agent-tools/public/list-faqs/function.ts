import { runEffect } from "#/lib/effect-query";
import { listOpenCountryRefsEffect } from "#/modules/country";
import { listFaqsSvc } from "#/modules/faq";
import { applyFaqTopic, faqReadScope } from "#/modules/chat-bot/lib";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import type { ListFaqsInput, ListFaqsResult } from "./schema";

export const listFaqs = async (input: ListFaqsInput, runtime: ChatBotRuntime): Promise<ListFaqsResult> => {
  const { location, country, note, scope } = await faqReadScope(input, runtime);
  const listed = await runEffect(listFaqsSvc(runtime.db, runtime.owner.tenantId, scope));
  const topic = input.topic?.trim();
  if (!topic) return { location, country, note, ...listed };
  const [all, countries] = await Promise.all([
    runEffect(listFaqsSvc(runtime.db, runtime.owner.tenantId, { kind: "all" })),
    runEffect(listOpenCountryRefsEffect(runtime.db, runtime.owner.tenantId)),
  ]);
  const matched = applyFaqTopic({
    topic,
    scopedFaqs: listed.faqs,
    allFaqs: all.faqs,
    countries,
    note,
  });
  return { location, country, categories: listed.categories, faqs: matched.faqs, note: matched.note };
};
