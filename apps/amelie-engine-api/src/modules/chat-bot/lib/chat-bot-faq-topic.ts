import {
  CHAT_BOT_FAQ_TOPIC_HIT_NOTE,
  CHAT_BOT_FAQ_TOPIC_MISS_NOTE,
  CHAT_BOT_FAQ_TOPIC_OTHER_NOTE,
} from "#/modules/chat-bot/constants";
import { joinToolNotes } from "./chat-bot-location-needed";

const STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "for",
  "and",
  "or",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "be",
  "do",
  "does",
  "did",
  "can",
  "i",
  "we",
  "you",
  "your",
  "our",
  "my",
  "me",
  "they",
  "their",
  "this",
  "that",
  "what",
  "when",
  "where",
  "how",
  "have",
  "has",
  "had",
  "with",
  "from",
  "not",
  "no",
  "yes",
  "please",
  "it",
  "its",
  "if",
  "about",
  "any",
  "also",
]);

type TopicFaq = {
  id: string;
  question: string;
  answer: string;
  countryId: string | null;
  locationId: string | null;
};

export const faqTopicTokens = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 3 && !STOP.has(word));

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
}): { faqs: T[]; note: string | null } => {
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
