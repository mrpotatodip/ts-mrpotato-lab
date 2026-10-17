import type { Country, Faq, FaqCategory, Location } from "@repo/contracts/amelie";

import { FaqItem } from "./faq-item";

type FaqListProps = {
  faqs: Faq[];
  categories: FaqCategory[];
  locations: Location[];
  countries: Country[];
};

export function FaqList({ faqs, categories, locations, countries }: FaqListProps) {
  if (faqs.length === 0) {
    return <p className="text-muted-foreground p-6 text-sm">No FAQs in this category yet.</p>;
  }

  return (
    <ul className="divide-y">
      {faqs.map((faq) => (
        <FaqItem
          key={`${faq.id}:${faq.question}:${faq.answer}:${faq.categoryId}:${faq.locationId}:${faq.countryId}`}
          faq={faq}
          categories={categories}
          locations={locations}
          countries={countries}
        />
      ))}
    </ul>
  );
}
