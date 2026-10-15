import { Suspense, useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "#/components/ui/button";
import { useSuspenseDashboardScope } from "#/modules/dashboard/hooks/use-dashboard-scope";
import { PageCard, PageHeader } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useMenuActions, useSuspenseMenu } from "../hooks";
import { moveId, toggleMenuFocus, type MenuFocus } from "../utils";
import { MenuCategoryForm } from "./menu-category-form";
import { MenuCategorySection } from "./menu-category-section";
import { MenuPanelSkeleton } from "./menu-panel-skeleton";
import { MenuTree } from "./menu-tree";

// -----
// The menu the assistant tells Customers about. The header
// shows at once; the rest waits behind the skeleton.
// -----
export function MenuSuspensePanelMain() {
  return (
    <>
      <PageHeader title="Menu" description="The categories and items the assistant describes to customers." />
      <Suspense fallback={<MenuPanelSkeleton />}>
        <MenuPanelView />
      </Suspense>
    </>
  );
}

function MenuPanelView() {
  const selection = useSuspenseDashboardScope();
  const { data } = useSuspenseMenu(selection.countryId);
  const { addCategory, reorderCategories } = useMenuActions();
  const { canEdit } = useActiveTenantRole();
  const [focus, setFocus] = useState<MenuFocus | null>(null);

  const focusedCategory = focus ? data.categories.find((category) => category.id === focus.categoryId) : undefined;
  const focusedItem = focusedCategory && focus?.itemId ? focusedCategory.items.find((item) => item.id === focus.itemId) : undefined;
  const activeFocus = focusedCategory && (focus?.itemId === null || focusedItem) ? focus : null;
  const ids = data.categories.map((category) => category.id);
  const refs = data.categories.map(({ id, name }) => ({ id, name }));

  const moveCategory = (id: string, direction: -1 | 1) => {
    const next = moveId(ids, id, direction);
    if (next !== ids) reorderCategories.mutate({ data: { ids: next } });
  };

  return (
    <div className="flex flex-col gap-8">
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="space-y-8 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:-mr-4 lg:overflow-y-auto lg:pr-4 lg:pb-1 lg:[overflow-anchor:none] lg:[scrollbar-width:thin]">
        {canEdit ? (
          <>
            <PageCard title="Add a category" description="A section of the menu, like Coffee or Pastries.">
              <MenuCategoryForm
                initial={null}
                submitLabel="Add category"
                isPending={addCategory.isPending}
                error={addCategory.isError ? addCategory.error.message : null}
                onSubmit={(body) => addCategory.mutate({ data: body })}
                onCancel={null}
              />
            </PageCard>
            <MenuTree categories={data.categories} countryId={selection.countryId} focus={activeFocus} onFocus={(next) => setFocus(toggleMenuFocus(activeFocus, next))} />
          </>
        ) : (
          <p className="text-muted-foreground text-xs">Only an owner or manager can change the menu.</p>
        )}
      </div>
      <div className="space-y-6">
        {activeFocus ? (
          <div className="bg-muted/60 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Eye className="size-4 shrink-0" aria-hidden />
              <span className="truncate">Showing only {focusedItem ? focusedItem.name : focusedCategory?.name}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setFocus(null)}>
              Show all
            </Button>
          </div>
        ) : null}
        {data.categories.map((category, index) => activeFocus && activeFocus.categoryId !== category.id ? null : (
          <MenuCategorySection
            key={`${category.id}:${category.name}:${category.note}`}
            category={category}
            categories={refs}
            dietaryTags={data.dietaryTags}
            canEdit={canEdit}
            country={selection.country}
            isFirst={index === 0}
            isLast={index === data.categories.length - 1}
            onlyItemId={activeFocus ? activeFocus.itemId : null}
            onMove={(direction) => moveCategory(category.id, direction)}
          />
        ))}
        {reorderCategories.isError ? <p className="text-xs text-destructive">{reorderCategories.error.message}</p> : null}
      </div>
    </div>
    </div>
  );
}
