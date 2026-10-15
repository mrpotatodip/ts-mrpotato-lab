import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Country, Faq, FaqCategory, Location } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { useFaqActions } from "../hooks";
import { faqBadgeLabel } from "../utils";
import { FaqForm } from "./faq-form";

type FaqItemProps = {
  faq: Faq;
  categories: FaqCategory[];
  locations: Location[];
  countries: Country[];
  canEdit: boolean;
};

export function FaqItem({ faq, categories, locations, countries, canEdit }: FaqItemProps) {
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
        {canEdit ? (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Edit FAQ" title="Edit" onClick={() => setIsEditing(true)}>
              <Pencil />
            </Button>
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
          </div>
        ) : null}
      </div>
      {badge ? <Badge variant="outline">{badge}</Badge> : null}
      <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
    </li>
  );
}
