import type { ImportDraft, UpdateImportDraftBody } from "@repo/contracts/amelie";
import { TEXT_FIELDS } from "../constants";
import type { MenuImportDraftFormValues } from "../schemas";

export type DraftFields = NonNullable<UpdateImportDraftBody["data"]>;

// -----
// The boxes of a draft's editor, filled from the draft:
// one text box per field of its kind, and Closed for hours.
// -----
export const toDraftFormValues = (draft: ImportDraft): MenuImportDraftFormValues => {
  const current = new Map(Object.entries(draft.data));
  return {
    text: Object.fromEntries(TEXT_FIELDS[draft.kind].map((field) => [field.name, String(current.get(field.name) ?? "")])),
    isClosed: draft.kind === "business_hours" ? draft.data.isClosed : false,
  };
};

// -----
// The draft's data with the boxes put back in; an empty
// box becomes null, and a closed day loses its times.
// -----
export const toDraftFields = (draft: ImportDraft, values: MenuImportDraftFormValues): DraftFields => {
  const next = new Map(Object.entries(draft.data));
  for (const field of TEXT_FIELDS[draft.kind]) {
    const text = values.text[field.name]?.trim();
    next.set(field.name, text ? text : null);
  }
  if (draft.kind === "business_hours") {
    next.set("isClosed", values.isClosed);
    if (values.isClosed) {
      next.set("opensAt", null);
      next.set("closesAt", null);
    }
  }
  return Object.fromEntries(next);
};
