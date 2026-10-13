import type { MenuCategory } from "@repo/contracts/amelie";

export type TreeOrder = {
  categories: string[];
  items: Record<string, string[]>;
};

export type DropPosition = "before" | "after";

export const toTreeOrder = (categories: MenuCategory[]): TreeOrder => ({
  categories: categories.map((category) => category.id),
  items: Object.fromEntries(categories.map((category) => [category.id, category.items.map((item) => item.id)])),
});

// -----
// The order as one string, so the tree can start over
// from the server's order when it changes.
// -----
export const treeOrderSignature = (order: TreeOrder): string =>
  order.categories.map((id) => `${id}:${(order.items[id] ?? []).join(",")}`).join("|");

export const findItemCategory = (order: TreeOrder, itemId: string): string | null =>
  order.categories.find((categoryId) => (order.items[categoryId] ?? []).includes(itemId)) ?? null;

const place = (list: string[], id: string, targetId: string, position: DropPosition): string[] => {
  const rest = list.filter((entry) => entry !== id);
  const at = rest.indexOf(targetId);
  if (at < 0) return list;
  return [...rest.slice(0, position === "before" ? at : at + 1), id, ...rest.slice(position === "before" ? at : at + 1)];
};

export const moveCategory = (order: TreeOrder, id: string, targetId: string, position: DropPosition): TreeOrder => {
  if (id === targetId) return order;
  return { ...order, categories: place(order.categories, id, targetId, position) };
};

// -----
// Drop an item next to another item (before or after it,
// in that item's category), or at the end of a category.
// -----
export type ItemTarget = { kind: "item"; itemId: string; position: DropPosition } | { kind: "category"; categoryId: string };

export const moveItem = (order: TreeOrder, itemId: string, target: ItemTarget): TreeOrder => {
  const from = findItemCategory(order, itemId);
  if (from === null) return order;
  if (target.kind === "item" && target.itemId === itemId) return order;

  const toCategory = target.kind === "category" ? target.categoryId : findItemCategory(order, target.itemId);
  if (toCategory === null || !order.items[toCategory]) return order;

  const withoutItem = { ...order.items, [from]: order.items[from].filter((id) => id !== itemId) };
  const targetList = withoutItem[toCategory];
  const nextList =
    target.kind === "category"
      ? [...targetList, itemId]
      : place([...targetList, itemId], itemId, target.itemId, target.position);

  return { ...order, items: { ...withoutItem, [toCategory]: nextList } };
};
