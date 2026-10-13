import type { Country, Faq, FaqCategory, Location } from "@repo/contracts/amelie";
import { Card } from "#/components/ui/card";
import { FaqItem } from "./faq-item";

type FaqListProps = {
  faqs: Faq[];
  categories: FaqCategory[];
  locations: Location[];
  countries: Country[];
  canEdit: boolean;
};

// -----
// General first, then each category in the
// Tenant's order; empty groups are left out.
// -----
export function FaqList({ faqs, categories, locations, countries, canEdit }: FaqListProps) {
  const groups = [
    { key: "general", title: "General", faqs: faqs.filter((faq) => faq.categoryId === null) },
    ...categories.map((category) => ({
      key: category.id,
      title: category.name,
      faqs: faqs.filter((faq) => faq.categoryId === category.id),
    })),
  ].filter((group) => group.faqs.length > 0);

  if (groups.length === 0) {
    return <p className="text-muted-foreground text-sm">No FAQs yet. Add the first one.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <h3 className="flex items-baseline gap-2 text-lg font-semibold">
            {group.title}
            <span className="text-muted-foreground text-sm font-normal">{group.faqs.length}</span>
          </h3>
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {group.faqs.map((faq) => (
                <FaqItem key={`${faq.id}:${faq.question}:${faq.answer}:${faq.categoryId}:${faq.locationId}:${faq.countryId}`} faq={faq} categories={categories} locations={locations} countries={countries} canEdit={canEdit} />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
