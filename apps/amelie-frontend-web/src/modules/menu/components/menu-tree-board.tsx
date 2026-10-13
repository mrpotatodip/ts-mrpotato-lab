import { useState, type DragEvent } from "react";
import { ChevronRight, Eye, GripVertical } from "lucide-react";
import type { MenuCategory } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import type { DropPosition, ItemTarget, MenuFocus, TreeOrder } from "../utils";

type Dragging = { kind: "category"; id: string } | { kind: "item"; id: string };

type Hint =
  | { kind: "category-edge"; id: string; position: DropPosition }
  | { kind: "category-inside"; id: string }
  | { kind: "item-edge"; id: string; position: DropPosition };

type MenuTreeBoardProps = {
  categories: MenuCategory[];
  initial: TreeOrder;
  focus: MenuFocus | null;
  onFocus: (next: MenuFocus) => void;
  onDropCategory: (order: TreeOrder, id: string, targetId: string, position: DropPosition) => TreeOrder;
  onDropItem: (order: TreeOrder, itemId: string, target: ItemTarget) => TreeOrder;
};

const positionIn = (event: DragEvent<HTMLElement>): DropPosition => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? "before" : "after";
};

const startDrag = (event: DragEvent<HTMLElement>, id: string) => {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", id);
};

const edgeClass = (position: DropPosition | null) =>
  cn("border-y-2 border-transparent", position === "before" && "border-t-primary", position === "after" && "border-b-primary");

type FocusEyeProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FocusEye({ label, active, onClick }: FocusEyeProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={active ? "Show everything" : "Show only this"}
      onClick={onClick}
      className={cn("size-7", active ? "bg-primary/15 text-primary" : "text-muted-foreground")}
    >
      <Eye className="size-4" aria-hidden />
    </Button>
  );
}

export function MenuTreeBoard({ categories, initial, focus, onFocus, onDropCategory, onDropItem }: MenuTreeBoardProps) {
  // -----
  // MenuTree keys this board by the server order, so a new
  // server order restarts it from that order.
  // -----
  const [order, setOrder] = useState(initial);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const itemById = new Map(categories.flatMap((category) => category.items).map((item) => [item.id, item]));

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const endDrag = () => {
    setDragging(null);
    setHint(null);
  };

  const overCategory = (event: DragEvent<HTMLElement>, id: string) => {
    if (dragging === null) return;
    event.preventDefault();
    if (dragging.kind === "category") setHint({ kind: "category-edge", id, position: positionIn(event) });
    else setHint({ kind: "category-inside", id });
  };

  const dropOnCategory = (event: DragEvent<HTMLElement>, id: string) => {
    event.preventDefault();
    if (dragging?.kind === "category") setOrder(onDropCategory(order, dragging.id, id, positionIn(event)));
    if (dragging?.kind === "item") {
      setOrder(onDropItem(order, dragging.id, { kind: "category", categoryId: id }));
      setOpen((current) => new Set(current).add(id));
    }
    endDrag();
  };

  const overItem = (event: DragEvent<HTMLElement>, id: string) => {
    if (dragging?.kind !== "item") return;
    event.preventDefault();
    event.stopPropagation();
    setHint({ kind: "item-edge", id, position: positionIn(event) });
  };

  const dropOnItem = (event: DragEvent<HTMLElement>, id: string) => {
    if (dragging?.kind !== "item") return;
    event.preventDefault();
    event.stopPropagation();
    setOrder(onDropItem(order, dragging.id, { kind: "item", itemId: id, position: positionIn(event) }));
    endDrag();
  };

  return (
    <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto lg:max-h-none lg:overflow-visible" onDragEnd={endDrag}>
      {order.categories.map((categoryId) => {
        const category = categoryById.get(categoryId);
        if (!category) return null;
        const itemIds = order.items[categoryId] ?? [];
        const isOpen = open.has(categoryId);
        const categoryHint = hint && hint.kind !== "item-edge" && hint.id === categoryId ? hint : null;

        return (
          <li key={categoryId}>
            <div
              draggable
              onDragStart={(event) => {
                startDrag(event, categoryId);
                setDragging({ kind: "category", id: categoryId });
              }}
              onDragOver={(event) => overCategory(event, categoryId)}
              onDrop={(event) => dropOnCategory(event, categoryId)}
              className={cn(
                "hover:bg-muted flex cursor-grab items-center gap-1 rounded-md px-1 py-1.5 text-sm font-medium active:cursor-grabbing",
                edgeClass(categoryHint?.kind === "category-edge" ? categoryHint.position : null),
                categoryHint?.kind === "category-inside" && "bg-primary/10",
                dragging?.kind === "category" && dragging.id === categoryId && "opacity-40",
              )}
            >
              <GripVertical className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-w-0 flex-1 justify-start gap-1 p-0 font-medium hover:bg-transparent"
                aria-expanded={isOpen}
                onClick={() => toggle(categoryId)}
              >
                <ChevronRight className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-90")} aria-hidden />
                <span className="truncate">{category.name}</span>
              </Button>
              <span className="text-muted-foreground text-xs font-normal">{itemIds.length}</span>
              <FocusEye
                label={`Show only ${category.name}`}
                active={focus?.categoryId === categoryId && focus.itemId === null}
                onClick={() => onFocus({ categoryId, itemId: null })}
              />
            </div>

            {isOpen ? (
              <ul className="border-border ml-5 space-y-0.5 border-l pl-2">
                {itemIds.length === 0 ? <li className="text-muted-foreground px-1 py-1 text-xs">No items. Drop one here.</li> : null}
                {itemIds.map((itemId) => {
                  const item = itemById.get(itemId);
                  if (!item) return null;
                  const itemHint = hint?.kind === "item-edge" && hint.id === itemId ? hint.position : null;

                  return (
                    <li
                      key={itemId}
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation();
                        startDrag(event, itemId);
                        setDragging({ kind: "item", id: itemId });
                      }}
                      onDragOver={(event) => overItem(event, itemId)}
                      onDrop={(event) => dropOnItem(event, itemId)}
                      className={cn(
                        "hover:bg-muted flex cursor-grab items-center gap-1 rounded-md px-1 py-1 text-sm active:cursor-grabbing",
                        edgeClass(itemHint),
                        dragging?.kind === "item" && dragging.id === itemId && "opacity-40",
                        !item.isAvailable && "text-muted-foreground",
                      )}
                    >
                      <GripVertical className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <FocusEye
                        label={`Show only ${item.name}`}
                        active={focus?.itemId === itemId}
                        onClick={() => onFocus({ categoryId, itemId })}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
