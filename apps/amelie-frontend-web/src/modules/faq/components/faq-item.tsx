import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Country, Faq, FaqCategory, Location } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { PowerMark } from "#/modules/shared";
import { useFaqAccess, useFaqActions } from "../hooks";
import { faqBadgeLabel } from "../utils";
import { FaqForm } from "./faq-form";

type FaqItemProps = {
  faq: Faq;
  categories: FaqCategory[];
  locations: Location[];
  countries: Country[];
};

export function FaqItem({ faq, categories, locations, countries }: FaqItemProps) {
  const { canUpdateFaq, canDeleteFaq } = useFaqAccess();
  const { update, remove } = useFaqActions();
  const [isEditing, setIsEditing] = useState(false);
  const badge = faqBadgeLabel(faq, locations, countries);

  if (isEditing) {
    return (
      <li className="p-6">
        <FaqForm
          categories={categories}
          locations={locations}
          countries={countries}
          initial={faq}
          submitLabel="Save"
          isPending={update.isPending}
          error={update.isError ? update.error.message : null}
          onSubmit={(body) => update.mutate({ data: { faqId: faq.id, ...body } }, { onSuccess: () => setIsEditing(false) })}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="space-y-2 p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-sm font-medium">{faq.question}</p>
        {canUpdateFaq || canDeleteFaq ? (
          <div className="flex shrink-0 items-center gap-1">
            {canUpdateFaq ? (
              <>
                <PowerMark power="company:faqs:faqs:update" />
                <Button variant="ghost" size="icon-sm" aria-label="Edit FAQ" title="Edit" onClick={() => setIsEditing(true)}>
                  <Pencil />
                </Button>
              </>
            ) : null}
            {canDeleteFaq ? (
              <>
                <PowerMark power="company:faqs:faqs:delete" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete FAQ"
                  title="Delete"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this FAQ?")) remove.mutate({ data: { faqId: faq.id } });
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {badge ? <Badge variant="outline">{badge}</Badge> : null}
      <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
    </li>
  );
}
