import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import type { ImportDraft } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { DashboardStatusBadge } from "#/modules/dashboard/components/dashboard-status-badge";
import { describeHours } from "#/modules/schedule";
import { PowerMark } from "#/modules/shared";
import { useMenuImportActions } from "../hooks";
import { importPriceText } from "../utils";
import { MenuImportDraftEditor } from "./menu-import-draft-editor";

type MenuImportDraftProps = {
  importId: string;
  draft: ImportDraft;
  canEdit: boolean;
  currency?: string;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DraftText = { title: string; detail: string };

const describe = (draft: ImportDraft, currency: string | undefined): DraftText => {
  switch (draft.kind) {
    case "menu_category":
      return { title: draft.data.name, detail: draft.data.note ?? "" };
    case "menu_item": {
      const price = draft.data.variants
        ? draft.data.variants.map((variant) => `${variant.name} ${importPriceText(variant.price, currency)}`).join(" / ")
        : draft.data.price === null
          ? null
          : importPriceText(draft.data.price, currency);
      const tags = draft.data.dietaryTags.length > 0 ? draft.data.dietaryTags.join(", ") : "";
      return {
        title: `${draft.data.name} · ${price}`,
        detail: [draft.data.description, tags].filter(Boolean).join(" · "),
      };
    }
    case "business_hours":
      return {
        title: DAYS[draft.data.dayOfWeek],
        detail: describeHours(draft.data),
      };
    case "business_profile":
      return {
        title: "Contact details",
        detail: Object.entries(draft.data)
          .filter(([, value]) => value !== null)
          .map(([field, value]) => `${field}: ${value}`)
          .join(" · "),
      };
  }
};

// -----
// One draft: what Amelie read, a "needs a look" badge
// when it was unsure, and approve, discard and edit.
// -----
export function MenuImportDraft({ importId, draft, canEdit, currency }: MenuImportDraftProps) {
  const { updateDraft } = useMenuImportActions();
  const [isEditing, setIsEditing] = useState(false);
  const setStatus = (status: ImportDraft["status"]) =>
    updateDraft.mutate({ data: { importId, draftId: draft.id, body: { status } } });

  if (isEditing) {
    return (
      <li className="px-6 py-5">
        <MenuImportDraftEditor
          draft={draft}
          isPending={updateDraft.isPending}
          error={updateDraft.isError ? updateDraft.error.message : null}
          onSave={(data) =>
            updateDraft.mutate({ data: { importId, draftId: draft.id, body: { data } } }, { onSuccess: () => setIsEditing(false) })
          }
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  const text = describe(draft, currency);
  const isDiscarded = draft.status === "discarded";

  return (
    <li className="flex flex-col gap-2 px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <p className={isDiscarded ? "text-muted-foreground min-w-0 text-sm font-medium line-through" : "min-w-0 text-sm font-medium"}>
          {text.title}
        </p>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <PowerMark power="company:menu:import_drafts:update" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Approve draft"
              title="Approve"
              disabled={updateDraft.isPending || draft.status === "approved"}
              onClick={() => setStatus("approved")}
            >
              <Check />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Discard draft"
              title="Discard"
              disabled={updateDraft.isPending || isDiscarded}
              onClick={() => setStatus("discarded")}
            >
              <X />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Edit draft" title="Edit" onClick={() => setIsEditing(true)}>
              <Pencil />
            </Button>
          </div>
        ) : null}
      </div>
      {text.detail ? (
        <p className={isDiscarded ? "text-muted-foreground text-sm leading-relaxed line-through" : "text-muted-foreground text-sm leading-relaxed"}>
          {text.detail}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {draft.status === "approved" ? <DashboardStatusBadge tone="success">Approved</DashboardStatusBadge> : null}
        {isDiscarded ? <DashboardStatusBadge tone="neutral">Discarded</DashboardStatusBadge> : null}
        {draft.reviewNote ? <DashboardStatusBadge tone="warning">Needs a look</DashboardStatusBadge> : null}
        {draft.reviewNote ? <span className="text-muted-foreground text-xs">{draft.reviewNote}</span> : null}
      </div>
      {updateDraft.isError ? <p className="text-xs text-destructive">{updateDraft.error.message}</p> : null}
    </li>
  );
}
