import type { MenuCategory, MenuEditor } from "@repo/contracts/amelie";

const sortByIds = <T extends { id: string }>(rows: T[], ids: string[]): T[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const named = ids.flatMap((id) => byId.get(id) ?? []);
  return [...named, ...rows.filter((row) => !ids.includes(row.id))];
};

export const withCategoriesOrder = (menu: MenuEditor, ids: string[]): MenuEditor => ({
  ...menu,
  categories: sortByIds(menu.categories, ids),
});

export const withItemsOrder = (menu: MenuEditor, categoryId: string, ids: string[]): MenuEditor => ({
  ...menu,
  categories: menu.categories.map(
    (category): MenuCategory =>
      category.id === categoryId ? { ...category, items: sortByIds(category.items, ids) } : category,
  ),
});
