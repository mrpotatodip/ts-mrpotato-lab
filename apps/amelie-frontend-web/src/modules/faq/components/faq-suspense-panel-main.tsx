import { Suspense } from "react";

import { activeCountries, useSuspenseCountries } from "#/modules/country";
import { useSuspenseLocations } from "#/modules/location";
import { PageHeader } from "#/modules/shared";
import { useSuspenseFaqs } from "../hooks";
import { faqGroupFor, faqGroups, resolveFaqCategoryKey } from "../utils";
import { FaqCategoryNav } from "./faq-category-nav";
import { FaqCategorySection } from "./faq-category-section";
import { FaqPanelSkeleton } from "./faq-panel-skeleton";

type FaqSuspensePanelMainProps = {
  categoryKey: string | undefined;
};

export function FaqSuspensePanelMain({ categoryKey }: FaqSuspensePanelMainProps) {
  return (
    <>
      <PageHeader
        title="FAQs"
        description="The questions your assistant answers from. Open a category to add and edit its answers."
        power="company:faqs:faqs:read"
      />
      <Suspense fallback={<FaqPanelSkeleton />}>
        <FaqPanelView categoryKey={categoryKey} />
      </Suspense>
    </>
  );
}

function FaqPanelView({ categoryKey }: { categoryKey: string | undefined }) {
  const { data } = useSuspenseFaqs();
  const { data: allLocations } = useSuspenseLocations();
  const { data: allCountries } = useSuspenseCountries();
  const locations = allLocations.filter((location) => location.archivedAt === null);
  const groups = faqGroups(data.faqs, data.categories);
  const selectedKey = resolveFaqCategoryKey(data.categories, categoryKey);
  const group = faqGroupFor(groups, selectedKey);

  return (
    <div className="grid items-start gap-8 lg:gap-x-16 lg:grid-cols-[2fr_3fr]">
      <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:-mr-4 lg:overflow-y-auto lg:pr-4 lg:pb-1 lg:[overflow-anchor:none] lg:[scrollbar-width:thin]">
        <FaqCategoryNav groups={groups} selectedKey={selectedKey} />
      </div>
      <FaqCategorySection
        key={`${group.key}:${group.title}`}
        group={group}
        categories={data.categories}
        locations={locations}
        countries={allCountries}
        formCountries={activeCountries(allCountries)}
      />
    </div>
  );
}
