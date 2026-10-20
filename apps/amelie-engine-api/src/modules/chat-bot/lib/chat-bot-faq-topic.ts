import {
  CHAT_BOT_FAQ_TOPIC_HIT_NOTE,
  CHAT_BOT_FAQ_TOPIC_MISS_NOTE,
  CHAT_BOT_FAQ_TOPIC_OTHER_NOTE,
  CHAT_BOT_FAQ_TOPIC_STOPWORDS,
} from "#/modules/chat-bot/constants";
import type { FaqTopicResult, TopicFaq } from "#/modules/chat-bot/types";
import { joinToolNotes } from "./chat-bot-location-needed";

export const faqTopicTokens = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 3 && !CHAT_BOT_FAQ_TOPIC_STOPWORDS.has(word));

const tokenHitsHay = (needle: string, hay: Set<string>): boolean =>
  hay.has(needle) || [...hay].some((word) => word.startsWith(needle) || needle.startsWith(word));

export const faqMatchesTopic = (faq: Pick<TopicFaq, "question" | "answer">, topic: string): boolean => {
  const needles = faqTopicTokens(topic);
  if (needles.length === 0) return false;
  const hay = new Set(faqTopicTokens(`${faq.question} ${faq.answer}`));
  const hits = needles.filter((needle) => tokenHitsHay(needle, hay));
  return needles.length === 1 ? hits.length === 1 : hits.length >= 2;
};

const otherWhere = (
  hidden: TopicFaq[],
  countries: ReadonlyArray<{ id: string; name: string }>,
): string => {
  const names = [
    ...new Set(
      hidden.flatMap((faq) => {
        const country = countries.find((row) => row.id === faq.countryId);
        if (country) return [country.name];
        if (faq.locationId) return ["another location"];
        return [];
      }),
    ),
  ];
  return names.length > 0 ? names.join(", ") : "another country or location";
};

export const applyFaqTopic = <T extends TopicFaq>(input: {
  topic: string | null | undefined;
  scopedFaqs: T[];
  allFaqs: T[];
  countries: ReadonlyArray<{ id: string; name: string }>;
  note: string | null;
}): FaqTopicResult<T> => {
  const topic = input.topic?.trim();
  if (!topic) return { faqs: input.scopedFaqs, note: input.note };
  const hits = input.scopedFaqs.filter((faq) => faqMatchesTopic(faq, topic));
  if (hits.length > 0) {
    return { faqs: hits, note: joinToolNotes(input.note, CHAT_BOT_FAQ_TOPIC_HIT_NOTE) };
  }
  const scopedIds = new Set(input.scopedFaqs.map((faq) => faq.id));
  const hidden = input.allFaqs.filter((faq) => !scopedIds.has(faq.id) && faqMatchesTopic(faq, topic));
  if (hidden.length > 0) {
    return {
      faqs: [],
      note: joinToolNotes(input.note, CHAT_BOT_FAQ_TOPIC_OTHER_NOTE(otherWhere(hidden, input.countries))),
    };
  }
  return { faqs: [], note: joinToolNotes(input.note, CHAT_BOT_FAQ_TOPIC_MISS_NOTE) };
};
