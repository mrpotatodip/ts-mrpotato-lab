import { useState } from "react";
import type { MenuCategory } from "@repo/contracts/amelie";

import { PageCard } from "#/modules/shared";
import { useMenuActions } from "../hooks";
import {
  findItemCategory,
  moveCategory,
  moveItem,
  toMenuItemBody,
  toTreeOrder,
  treeOrderSignature,
  type DropPosition,
  type MenuFocus,
  type ItemTarget,
  type TreeOrder,
} from "../utils";
import { MenuTreeBoard } from "./menu-tree-board";

type MenuTreeProps = {
  categories: MenuCategory[];
  countryId: string | undefined;
  focus: MenuFocus | null;
  onFocus: (next: MenuFocus) => void;
};

// -----
// Drag to reorder categories and items, or drop an item
// on another category to move it. The board keeps the order
// you made until the server's order arrives; if a save
// fails it starts over from the server's order.
// -----
export function MenuTree({ categories, countryId, focus, onFocus }: MenuTreeProps) {
  const { reorderCategories, reorderItems, updateItem } = useMenuActions();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const serverOrder = toTreeOrder(categories);

  const save = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the new order");
      setAttempt((count) => count + 1);
    }
  };

  const dropCategory = (order: TreeOrder, id: string, targetId: string, position: DropPosition): TreeOrder => {
    const next = moveCategory(order, id, targetId, position);
    if (treeOrderSignature(next) !== treeOrderSignature(order)) {
      void save(() => reorderCategories.mutateAsync({ data: { ids: next.categories } }));
    }
    return next;
  };

  const dropItem = (order: TreeOrder, itemId: string, target: ItemTarget): TreeOrder => {
    const next = moveItem(order, itemId, target);
    if (treeOrderSignature(next) === treeOrderSignature(order)) return next;

    const from = findItemCategory(order, itemId);
    const to = findItemCategory(next, itemId);
    const item = categories.flatMap((category) => category.items).find((entry) => entry.id === itemId);
    if (to === null || item === undefined) return order;

    void save(async () => {
      if (to !== from) await updateItem.mutateAsync({ data: { itemId, body: toMenuItemBody(item, to, { countryId }) } });
      await reorderItems.mutateAsync({ data: { categoryId: to, ids: next.items[to] } });
    });
    return next;
  };

  return (
    <PageCard title="Organize" description="Drag to reorder. Drop an item on a category to move it." contentClassName="p-3">
      <MenuTreeBoard
        key={`${treeOrderSignature(serverOrder)}:${attempt}`}
        categories={categories}
        initial={serverOrder}
        focus={focus}
        onFocus={onFocus}
        onDropCategory={dropCategory}
        onDropItem={dropItem}
      />
      {error ? <p className="px-3 pt-2 text-xs text-destructive">{error}</p> : null}
    </PageCard>
  );
}
