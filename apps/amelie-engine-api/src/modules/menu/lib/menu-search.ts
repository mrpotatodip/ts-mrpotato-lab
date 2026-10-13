import { MENU_FIND_RESULTS_MAX } from "#/modules/menu/constants";
import type { MenuCategory, MenuItemMatch } from "#/modules/menu/types";

const hasTag = (item: MenuItemMatch, tag: string) => item.dietaryTags.includes(tag);

const noteMentions = (item: MenuItemMatch, tag: string) =>
  (item.categoryNote ?? "").toLowerCase().includes(tag);

// -----
// Text also matches the category note; a tag
// lists tagged items, then notes offering it.
// -----
export const findMenuItems = (
  menu: MenuCategory[],
  { text, dietaryTag }: { text: string | null; dietaryTag: string | null },
): MenuItemMatch[] => {
  const needle = text?.trim().toLowerCase() ?? "";
  const tag = dietaryTag?.trim().toLowerCase() ?? "";
  const matches = menu
    .flatMap((category) =>
      category.items.map((item) => ({ ...item, category: category.name, categoryNote: category.note })),
    )
    .filter((item) => {
      const haystack = [item.name, item.description ?? "", item.category, item.categoryNote ?? ""]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (tag && !hasTag(item, tag) && !noteMentions(item, tag)) return false;
      return true;
    });
  const tagged = tag ? matches.filter((item) => hasTag(item, tag)) : matches;
  const offered = tag ? matches.filter((item) => !hasTag(item, tag)) : [];
  return [...tagged, ...offered].slice(0, MENU_FIND_RESULTS_MAX);
};
