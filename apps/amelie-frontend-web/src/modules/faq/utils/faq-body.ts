import { FAQ_NO_CATEGORY } from "../constants";
import type { FaqFormValues } from "../schemas";
import { fromScopeValue } from "./faq-scope";

// -----
// The form holds select-friendly strings; the server
// wants a category id or null, and at most one of
// Location and Country. Not yet validated.
// -----
export const toFaqBodyInput = (values: FaqFormValues) => ({
  categoryId: values.categoryId === FAQ_NO_CATEGORY ? null : values.categoryId,
  ...fromScopeValue(values.scope),
  question: values.question,
  answer: values.answer,
});
