export type Faq = {
  id: string;
  categoryId: string | null;
  category: string | null;
  locationId: string | null;
  countryId: string | null;
  question: string;
  answer: string;
};

export type FaqCategory = { id: string; name: string };

export type FaqList = { categories: FaqCategory[]; faqs: Faq[] };

export type FaqScope =
  | { kind: "all" }
  | { kind: "tenantWide" }
  | { kind: "country"; countryId: string }
  | { kind: "location"; locationId: string };
