import { describe, expect, it } from "vitest";
import type { FaqResult } from "@repo/contracts/chat-bots";

import { toChatBotFaqGroups } from "../to-chat-bot-faq";
import { toChatBotProfileRows } from "../to-chat-bot-profile";

const faq = (id: string, category: string | null): FaqResult => ({
  id,
  categoryId: null,
  category,
  locationId: null,
  countryId: null,
  question: `Q${id}`,
  answer: `A${id}`,
});

describe("toChatBotFaqGroups", () => {
  it("groups by category in order of first appearance, with General for none", () => {
    const groups = toChatBotFaqGroups([faq("1", "Ordering"), faq("2", null), faq("3", "Ordering")]);
    expect(groups.map((group) => group.category)).toEqual(["Ordering", "General"]);
    expect(groups[0].faqs.map((entry) => entry.id)).toEqual(["1", "3"]);
  });
});

describe("toChatBotProfileRows", () => {
  it("keeps only the facts the cafe has, labelled", () => {
    expect(
      toChatBotProfileRows({ description: null, websiteUrl: "https://a.test", phone: "555", email: null, address: "1 Main St" }),
    ).toEqual([
      { label: "Address", value: "1 Main St" },
      { label: "Phone", value: "555" },
      { label: "Website", value: "https://a.test" },
    ]);
  });
});
