import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { IMPORT_IMAGE_TYPES, MENU_ITEM_IMAGE_MAX, type MenuItemImage } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { menuItemImagePath, remainingMenuItemImageSlots, toMenuItemImageUrl } from "../utils";

type MenuItemImagesProps = {
  itemName: string;
  images: MenuItemImage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  isUploading: boolean;
  error: string | null;
  onAdd: (files: File[]) => void;
  onCover: (imageId: string) => void;
  onMove: (imageId: string, direction: -1 | 1) => void;
  onDelete: (imageId: string) => void;
};

const ACCEPT = IMPORT_IMAGE_TYPES.join(",");

export function MenuItemImages({
  itemName,
  images,
  open,
  onOpenChange,
  isPending,
  isUploading,
  error,
  onAdd,
  onCover,
  onMove,
  onDelete,
}: MenuItemImagesProps) {
  const input = useRef<HTMLInputElement>(null);
  const remaining = remainingMenuItemImageSlots(images.length);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-[2px]"
        className="inset-y-4 right-4 h-auto w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border bg-card sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>{itemName}</SheetTitle>
          <SheetDescription>
            JPEG, PNG or WebP, up to {MENU_ITEM_IMAGE_MAX} photos, 10 MB each. Cover is the first photo.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          {images.length === 0 ? <p className="text-muted-foreground text-sm">No photos yet.</p> : null}
          {images.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {images.map((image, index) => {
                const src = toMenuItemImageUrl(menuItemImagePath(image.id));
                return (
                  <li key={image.id} className="flex items-center gap-3">
                    {src ? (
                      <img src={src} alt="" className="size-24 shrink-0 rounded-lg object-cover" />
                    ) : null}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move up"
                        title="Move up"
                        disabled={isPending || index === 0}
                        onClick={() => onMove(image.id, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move down"
                        title="Move down"
                        disabled={isPending || index === images.length - 1}
                        onClick={() => onMove(image.id, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending || index === 0}
                        onClick={() => onCover(image.id)}
                      >
                        Cover
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove photo"
                        title="Remove photo"
                        disabled={isPending}
                        onClick={() => {
                          if (window.confirm(`Remove this photo from "${itemName}"?`)) onDelete(image.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {remaining > 0 ? (
            <div>
              <input
                ref={input}
                type="file"
                className="sr-only"
                aria-label={`Add photos to ${itemName}`}
                accept={ACCEPT}
                multiple
                disabled={isPending}
                onChange={(event) => {
                  const chosen = event.target.files;
                  if (!chosen || chosen.length === 0) return;
                  onAdd(Array.from(chosen).slice(0, remaining));
                  event.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => input.current?.click()}>
                <ImagePlus />
                {isUploading ? "Uploading..." : "Add photos"}
              </Button>
            </div>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
