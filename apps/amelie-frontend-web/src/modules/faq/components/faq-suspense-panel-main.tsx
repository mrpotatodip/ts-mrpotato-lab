import { Suspense } from "react";

import { activeCountries, useSuspenseCountries } from "#/modules/country";
import { useSuspenseLocations } from "#/modules/location";
import { PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useFaqActions, useSuspenseFaqs } from "../hooks";
import { FaqCategoryManager } from "./faq-category-manager";
import { FaqForm } from "./faq-form";
import { FaqList } from "./faq-list";
import { FaqPanelSkeleton } from "./faq-panel-skeleton";

// -----
// The questions the assistant answers from, grouped in
// the Tenant's own categories. The header shows at once;
// the panel waits behind the skeleton.
// -----
export function FaqSuspensePanelMain() {
  return (
    <>
      <PageHeader
        title="FAQs"
        description="The questions your assistant answers from. Group them into categories so customers get the right answer."
      />
      <Suspense fallback={<FaqPanelSkeleton />}>
        <FaqPanelView />
      </Suspense>
    </>
  );
}

function FaqPanelView() {
  const { data } = useSuspenseFaqs();
  const { add } = useFaqActions();
  const { canEdit } = useActiveTenantRole();
  const { data: allLocations } = useSuspenseLocations();
  const { data: allCountries } = useSuspenseCountries();
  const locations = allLocations.filter((location) => location.archivedAt === null);

  return (
    <div className="grid items-start gap-8 lg:gap-x-16 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-8">
        {canEdit ? (
          <PageCard title="Add an FAQ" description="A question customers ask, and the answer the assistant should give.">
            <FaqForm
              categories={data.categories}
              locations={locations}
              countries={activeCountries(allCountries)}
              initial={null}
              submitLabel="Add FAQ"
              isPending={add.isPending}
              error={add.isError ? add.error.message : null}
              onSubmit={(body) => add.mutate({ data: body })}
              onCancel={null}
            />
          </PageCard>
        ) : (
          <p className="text-muted-foreground text-xs">Only an owner or manager can change these.</p>
        )}
        {canEdit ? <FaqCategoryManager categories={data.categories} /> : null}
      </div>
      <FaqList faqs={data.faqs} categories={data.categories} locations={locations} countries={allCountries} canEdit={canEdit} />
    </div>
  );
}
