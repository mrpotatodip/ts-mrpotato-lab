import { Skeleton } from "#/components/ui/skeleton";
import { PageCard } from "#/modules/shared";

function MenuTreeCategorySkeleton({ itemCount }: { itemCount: number }) {
  return (
    <li>
      <div className="flex items-center gap-1 rounded-md px-1 py-1.5">
        <Skeleton className="size-4" />
        <Skeleton className="size-4" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-3 w-4" />
        <Skeleton className="size-7 rounded-md" />
      </div>
      {itemCount > 0 ? (
        <ul className="border-border ml-5 space-y-0.5 border-l pl-2">
          {Array.from({ length: itemCount }, (_, index) => (
            <li key={index} className="flex items-center gap-1 rounded-md px-1 py-1">
              <Skeleton className="size-3.5" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="size-7 rounded-md" />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MenuItemRowSkeleton({ kind }: { kind: "catalog" | "floor" }) {
  return (
    <li className="flex items-center justify-between gap-4 p-6">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex shrink-0 gap-1">
        {kind === "floor" ? (
          <Skeleton className="h-9 w-20 rounded-md" />
        ) : (
          <>
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </>
        )}
      </div>
    </li>
  );
}

function MenuCategoryCardSkeleton({ kind }: { kind: "catalog" | "floor" }) {
  return (
    <PageCard
      title="Category"
      action={
        kind === "catalog" ? (
          <div className="flex gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ) : undefined
      }
      contentClassName="p-0"
    >
      <ul className="divide-y">
        <MenuItemRowSkeleton kind={kind} />
        <MenuItemRowSkeleton kind={kind} />
        <MenuItemRowSkeleton kind={kind} />
      </ul>
      {kind === "catalog" ? (
        <div className="border-t p-6">
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      ) : null}
    </PageCard>
  );
}

export function MenuPanelSkeleton({ kind }: { kind: "catalog" | "floor" }) {
  const cards = (
    <div className="space-y-6">
      <MenuCategoryCardSkeleton kind={kind} />
      <MenuCategoryCardSkeleton kind={kind} />
    </div>
  );

  if (kind === "floor") return cards;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
      <div className="space-y-8">
        <PageCard title="Add a category" description="A section of the menu, like Coffee or Pastries.">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="mt-3 h-9 w-28 rounded-md" />
          </div>
        </PageCard>
        <PageCard title="Organize" description="Drag to reorder. Drop an item on a category to move it." contentClassName="p-3">
          <ul className="space-y-0.5">
            <MenuTreeCategorySkeleton itemCount={3} />
            <MenuTreeCategorySkeleton itemCount={2} />
          </ul>
        </PageCard>
      </div>
      {cards}
    </div>
  );
}
