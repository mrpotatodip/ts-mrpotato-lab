import type { FaqList } from "@repo/contracts/amelie";

export const withCategoryRenamed = (list: FaqList, categoryId: string, name: string): FaqList => ({
  categories: list.categories.map((category) => (category.id === categoryId ? { ...category, name } : category)),
  faqs: list.faqs.map((faq) => (faq.categoryId === categoryId ? { ...faq, category: name } : faq)),
});
