import type { Faq, FaqCategory } from "@repo/contracts/amelie";

import { FAQ_NO_CATEGORY } from "../constants";

export type FaqGroup = {
  key: string;
  title: string;
  category: FaqCategory | null;
  faqs: Faq[];
};

export function faqGroups(faqs: Faq[], categories: FaqCategory[]): FaqGroup[] {
  return [
    { key: FAQ_NO_CATEGORY, title: "General", category: null, faqs: faqs.filter((faq) => faq.categoryId === null) },
    ...categories.map((category) => ({
      key: category.id,
      title: category.name,
      category,
      faqs: faqs.filter((faq) => faq.categoryId === category.id),
    })),
  ];
}

export function resolveFaqCategoryKey(categories: FaqCategory[], key: string | undefined): string {
  if (key === undefined || key === FAQ_NO_CATEGORY) return FAQ_NO_CATEGORY;
  return categories.some((category) => category.id === key) ? key : FAQ_NO_CATEGORY;
}

export function faqGroupFor(groups: FaqGroup[], key: string): FaqGroup {
  const found = groups.find((group) => group.key === key);
  if (found) return found;
  return groups[0] ?? { key: FAQ_NO_CATEGORY, title: "General", category: null, faqs: [] };
}

export function faqNavEntries(categories: FaqCategory[]): Array<{ key: string; title: string }> {
  return [
    { key: FAQ_NO_CATEGORY, title: "General" },
    ...categories.map((category) => ({ key: category.id, title: category.name })),
  ];
}
