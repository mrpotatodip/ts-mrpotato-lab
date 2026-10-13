import type { ImportDraft } from "@repo/contracts/amelie";
import { describe, expect, it } from "vitest";
import { toDraftFields, toDraftFormValues } from "../menu-import-draft-form";

// SAFETY: a test fixture; only the fields the form reads are filled.
const hoursDraft = {
  id: "d1",
  kind: "business_hours",
  status: "pending",
  sourceFile: "menu.pdf",
  reviewNote: null,
  data: { dayOfWeek: 1, isClosed: false, opensAt: "08:00", closesAt: "17:00" },
} as ImportDraft;

// SAFETY: a test fixture; only the fields the form reads are filled.
const categoryDraft = {
  id: "d2",
  kind: "menu_category",
  status: "pending",
  sourceFile: "menu.pdf",
  reviewNote: null,
  data: { name: "Coffee", note: null },
} as ImportDraft;

describe("toDraftFormValues", () => {
  it("fills a box per field, blank for null", () => {
    expect(toDraftFormValues(categoryDraft)).toEqual({ text: { name: "Coffee", note: "" }, isClosed: false });
  });

  it("starts Closed from an hours draft", () => {
    expect(toDraftFormValues(hoursDraft).isClosed).toBe(false);
  });
});

describe("toDraftFields", () => {
  it("turns an empty box into null and trims the rest", () => {
    expect(toDraftFields(categoryDraft, { text: { name: " Tea ", note: "  " }, isClosed: false })).toEqual({ name: "Tea", note: null });
  });

  it("drops the times of a closed day", () => {
    const fields = toDraftFields(hoursDraft, { text: { opensAt: "08:00", closesAt: "17:00" }, isClosed: true });
    expect(fields).toMatchObject({ dayOfWeek: 1, isClosed: true, opensAt: null, closesAt: null });
  });
});
