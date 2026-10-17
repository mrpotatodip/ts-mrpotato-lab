import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Country, DietaryTag, Location, MenuCategory } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { PageCard, PowerMark } from "#/modules/shared";
import { useMenuActions } from "../hooks";
import type { MenuAccess } from "../types";
import { moveId } from "../utils";
import { MenuCategoryForm } from "./menu-category-form";
import { MenuItemForm } from "./menu-item-form";
import { MenuItemRow } from "./menu-item-row";

type MenuCategorySectionProps = {
  category: MenuCategory;
  categories: Array<Pick<MenuCategory, "id" | "name">>;
  dietaryTags: DietaryTag[];
  access: MenuAccess;
  kind: "catalog" | "floor";
  country: Country | undefined;
  location: Location | undefined;
  isFirst: boolean;
  isLast: boolean;
  onlyItemId: string | null;
  onMove: (direction: -1 | 1) => void;
};

// -----
// One category: its name and note, its items in
// order, and a form to add an item to it.
// -----
export function MenuCategorySection({
  category,
  categories,
  dietaryTags,
  access,
  kind,
  country,
  location,
  isFirst,
  isLast,
  onlyItemId,
  onMove,
}: MenuCategorySectionProps) {
  const isCatalog = kind === "catalog";
  const canShowCategoryControls = isCatalog && (access.canReorderCategories || access.canUpdateCategory || access.canDeleteCategory);
  const { updateCategory, removeCategory, addItem, reorderItems } = useMenuActions();
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const itemIds = category.items.map((item) => item.id);

  return (
    <PageCard
      title={isEditing ? "Edit category" : category.name}
      description={isEditing ? undefined : category.note ?? undefined}
      contentClassName="p-0"
      action={
        canShowCategoryControls && !isEditing ? (
          <div className="flex items-center gap-1">
            {access.canReorderCategories ? (
              <>
                <PowerMark power="company:menu:categories:reorder" />
                <Button variant="ghost" size="icon-sm" aria-label="Move category up" title="Move up" disabled={isFirst} onClick={() => onMove(-1)}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move category down" title="Move down" disabled={isLast} onClick={() => onMove(1)}>
                  <ArrowDown />
                </Button>
              </>
            ) : null}
            {access.canUpdateCategory ? (
              <>
                <PowerMark power="company:menu:categories:update" />
                <Button variant="ghost" size="icon-sm" aria-label="Edit category" title="Edit" onClick={() => setIsEditing(true)}>
                  <Pencil />
                </Button>
              </>
            ) : null}
            {access.canDeleteCategory ? (
              <>
                <PowerMark power="company:menu:categories:delete" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete category"
                  title="Delete"
                  disabled={removeCategory.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete "${category.name}" and its ${category.items.length} items?`)) {
                      removeCategory.mutate({ data: { categoryId: category.id } });
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            ) : null}
          </div>
        ) : null
      }
    >
      {isEditing ? (
        <div className="p-6">
          <MenuCategoryForm
            initial={{ name: category.name, note: category.note }}
            submitLabel="Save"
            isPending={updateCategory.isPending}
            error={updateCategory.isError ? updateCategory.error.message : null}
            onSubmit={(body) => updateCategory.mutate({ data: { categoryId: category.id, ...body } }, { onSuccess: () => setIsEditing(false) })}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : null}
      {removeCategory.isError ? <p className="px-6 pt-4 text-xs text-destructive">{removeCategory.error.message}</p> : null}

      {category.items.length === 0 ? (
        <p className="text-muted-foreground p-6 text-sm">No items yet.</p>
      ) : (
        <ul className="divide-y">
          {category.items.map((item, index) => onlyItemId !== null && item.id !== onlyItemId ? null : (
            <MenuItemRow
              key={`${item.id}:${item.name}:${item.price}:${item.currency}:${item.isSold}:${item.dietaryTags.join(",")}`}
              item={item}
              categoryId={category.id}
              categories={categories}
              dietaryTags={dietaryTags}
              access={access}
              kind={kind}
              country={country}
              location={location}
              isFirst={index === 0}
              isLast={index === category.items.length - 1}
              onMove={(direction) => reorderItems.mutate({ data: { categoryId: category.id, ids: moveId(itemIds, item.id, direction) } })}
            />
          ))}
        </ul>
      )}
      {reorderItems.isError ? <p className="px-6 pt-4 text-xs text-destructive">{reorderItems.error.message}</p> : null}

      {isCatalog && access.canCreateItem ? (
        <div className="border-t p-6">
          {isAdding ? (
            <MenuItemForm
              categories={categories}
              dietaryTags={dietaryTags}
              categoryId={category.id}
              country={country}
              initial={null}
              submitLabel="Add item"
              isPending={addItem.isPending}
              error={addItem.isError ? addItem.error.message : null}
              onSubmit={(body) => addItem.mutate({ data: body }, { onSuccess: () => setIsAdding(false) })}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <PowerMark power="company:menu:items:create" />
              <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                Add item
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </PageCard>
  );
}
