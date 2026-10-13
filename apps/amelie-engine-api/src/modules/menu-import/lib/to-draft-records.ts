import {
  BusinessHoursDraftDataSchema,
  BusinessProfileDraftDataSchema,
  MenuCategoryDraftDataSchema,
  MenuItemDraftDataSchema,
} from "@repo/contracts/amelie";
import type { ExtractedMenu } from "#/modules/menu-import/schemas";
import type { DraftRecord } from "#/modules/menu-import/types";
import { normalizePrice } from "./normalize-price";

const joinNotes = (...notes: Array<string | null>): string | null => {
  const present = notes.filter((note): note is string => note !== null && note.trim() !== "");
  return present.length > 0 ? present.join(" ") : null;
};

// -----
// The model's answer becomes drafts, each checked by
// its kind's schema. Something that does not fit is
// kept out and named in a review note, never guessed.
// -----
export const toDraftRecords = (
  extracted: ExtractedMenu,
  dietaryTagSlugs: ReadonlyArray<string>,
): DraftRecord[] => {
  const records: DraftRecord[] = [];

  extracted.categories.forEach((category, index) => {
    const skipped: string[] = [];
    const itemRecords: DraftRecord[] = [];

    for (const item of category.items) {
      const variants = (item.variants ?? []).flatMap((variant) => {
        const price = normalizePrice(variant.price);
        return price ? [{ name: variant.name.trim(), price }] : [];
      });
      const price = item.price === null ? null : normalizePrice(item.price);
      const parsed = MenuItemDraftDataSchema.safeParse({
        categoryName: category.name,
        name: item.name,
        description: item.description?.trim() || null,
        price: variants.length > 0 ? null : price,
        variants: variants.length > 0 ? variants : null,
        dietaryTags: item.dietaryTags.filter((slug) => dietaryTagSlugs.includes(slug)),
      });
      if (!parsed.success) {
        skipped.push(item.name);
        continue;
      }
      const priceUnclear = item.price !== null && price === null && variants.length === 0;
      itemRecords.push({
        kind: "menu_item",
        data: parsed.data,
        reviewNote: joinNotes(item.reviewNote, priceUnclear ? "The price was not clear." : null),
      });
    }

    const parsedCategory = MenuCategoryDraftDataSchema.safeParse({ name: category.name, note: category.note?.trim() || null });
    if (!parsedCategory.success) return;
    records.push({
      kind: "menu_category",
      data: parsedCategory.data,
      reviewNote: joinNotes(
        index === 0 ? extracted.menuReviewNote : null,
        category.reviewNote,
        skipped.length > 0 ? `Left out, no clear price: ${skipped.join(", ")}.` : null,
      ),
    });
    records.push(...itemRecords);
  });

  for (const hours of extracted.hours) {
    const parsed = BusinessHoursDraftDataSchema.safeParse({
      dayOfWeek: hours.dayOfWeek,
      isClosed: hours.isClosed,
      opensAt: hours.isClosed ? null : hours.opensAt,
      closesAt: hours.isClosed ? null : hours.closesAt,
    });
    if (parsed.success) records.push({ kind: "business_hours", data: parsed.data, reviewNote: hours.reviewNote });
  }

  const profile = BusinessProfileDraftDataSchema.safeParse(extracted.profile ?? {});
  if (profile.success && Object.values(profile.data).some((value) => value !== null)) {
    records.push({ kind: "business_profile", data: profile.data, reviewNote: null });
  }
  return records;
};
