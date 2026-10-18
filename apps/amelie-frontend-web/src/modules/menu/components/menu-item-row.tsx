import { ArrowDown, ArrowUp, Image, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Country, DietaryTag, Location, MenuCategory, MenuItem } from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { countryLabel } from "#/modules/country";
import { useActiveLocations } from "#/modules/location";
import { PowerMark } from "#/modules/shared";
import { useMenuActions } from "../hooks";
import type { MenuAccess } from "../types";
import { canManageMenuImages, firstMutationError, isMenuItemMuted, isMenuItemSoldNowhere, isMenuItemSoldOutHere, moveId, showsMenuItemLocationsControl, toMenuItemBody, toMenuItemImageUrl, toMenuItemSoldOutChange, toPriceEntryBody, toSoldBody } from "../utils";
import { MenuItemCountrySold } from "./menu-item-country-sold";
import { MenuItemForm } from "./menu-item-form";
import { MenuItemImages } from "./menu-item-images";
import { MenuItemLocationsForm } from "./menu-item-locations-form";

type MenuItemRowProps = {
  item: MenuItem;
  categoryId: string;
  categories: Array<Pick<MenuCategory, "id" | "name">>;
  dietaryTags: DietaryTag[];
  access: MenuAccess;
  kind: "catalog" | "floor";
  country: Country | undefined;
  location: Location | undefined;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
};

const describePrice = (item: MenuItem): string =>
  item.variants ? item.variants.map((variant) => `${variant.name} ${variant.price}`).join(" / ") : (item.price ?? "");

function MenuItemCover({ item, onOpenPhotos }: { item: MenuItem; onOpenPhotos?: () => void }) {
  const src = toMenuItemImageUrl(item.coverPath);
  if (!src) return null;
  const count = item.images.length;
  const thumb = <img src={src} alt="" className="size-10 rounded-lg object-cover" />;

  return (
    <div className="relative shrink-0">
      {onOpenPhotos ? (
        <Button type="button" variant="ghost" className="size-10 p-0" aria-label="Photos" onClick={onOpenPhotos}>
          {thumb}
        </Button>
      ) : (
        thumb
      )}
      <Badge
        variant="default"
        className="absolute -top-1.5 -right-1.5 min-w-5 justify-center px-1 py-0 text-[10px]"
        aria-label={`${count} photos`}
      >
        {count}
      </Badge>
    </div>
  );
}

export function MenuItemRow({
  item,
  categoryId,
  categories,
  dietaryTags,
  access,
  kind,
  country,
  location,
  isFirst,
  isLast,
  onMove,
}: MenuItemRowProps) {
  const isCatalog = kind === "catalog";
  const isFloor = kind === "floor";
  const { updateItem, removeItem, setLocations, setSoldOut, setSoldOutLocations, setCountryPrice, addImages, removeImage, setCover, reorderImages } =
    useMenuActions();
  const muted = country !== undefined && isMenuItemMuted(item);
  const { locations, isPending: locationsPending } = useActiveLocations();
  const [isEditing, setIsEditing] = useState(false);
  const [isChoosingLocations, setIsChoosingLocations] = useState(false);
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const hasSeveralLocations = locations.length > 1;
  const locationsLoaded = locations.length > 0;
  const soldNowhere = locationsLoaded && isMenuItemSoldNowhere(item, locations.map((place) => place.id));
  const showsLocationsControl = showsMenuItemLocationsControl(item, { hasSeveralLocations, soldNowhere });
  const locationNames = item.locationIds.map((id) => locations.find((place) => place.id === id)?.name ?? "A closed location");
  const openLocationIds = locations.map((place) => place.id);
  const soldOutChange = toMenuItemSoldOutChange(item, location?.id, openLocationIds);
  const soldOutHere =
    location !== undefined && hasSeveralLocations ? isMenuItemSoldOutHere(item, location.id) : !item.isAvailable;
  const soldOutPower = soldOutChange.kind === "locations" ? "store:menu:availability:update" : "company:menu:items:update";
  const canSoldOut = isFloor && (soldOutChange.kind === "locations" ? access.canSetAvailability : access.canUpdateItem);
  const canManageImages = isCatalog && canManageMenuImages(access);
  const canSetCountryPrice = isCatalog && access.canSetCountryPrice;
  const hasCatalogControls =
    isCatalog &&
    (access.canSetLocations || access.canReorderItems || access.canUpdateItem || canManageImages || access.canDeleteItem);

  if (isChoosingLocations) {
    return (
      <li className="py-3">
        <MenuItemLocationsForm
          item={item}
          locations={locations}
          isPending={setLocations.isPending}
          error={setLocations.isError ? setLocations.error.message : null}
          onSubmit={(body) =>
            setLocations.mutate({ data: { itemId: item.id, body } }, { onSuccess: () => setIsChoosingLocations(false) })
          }
          onCancel={() => setIsChoosingLocations(false)}
        />
      </li>
    );
  }

  if (isEditing) {
    return (
      <li className="p-6">
        <MenuItemForm
          categories={categories}
          dietaryTags={dietaryTags}
          categoryId={categoryId}
          country={country}
          initial={item}
          submitLabel="Save"
          isPending={updateItem.isPending}
          error={updateItem.isError ? updateItem.error.message : null}
          onSubmit={(body) => updateItem.mutate({ data: { itemId: item.id, body } }, { onSuccess: () => setIsEditing(false) })}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={cn("space-y-2 p-6", muted && "opacity-60")}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <MenuItemCover item={item} onOpenPhotos={canManageImages ? () => setIsPhotosOpen(true) : undefined} />
          <p className="min-w-0 text-sm font-medium">
            {item.name} <span className="text-muted-foreground font-normal">{describePrice(item)} {item.currency ?? ""}</span>
          </p>
        </div>
        {canSoldOut ? (
          <div className="flex shrink-0 items-center gap-2">
            <PowerMark power={soldOutPower} />
          <Button
            variant="outline"
            size="sm"
            disabled={setSoldOut.isPending || setSoldOutLocations.isPending || locationsPending}
            aria-label={
              location !== undefined && hasSeveralLocations
                ? soldOutHere
                  ? `Back on at ${location.name}`
                  : `Sold out at ${location.name}`
                : undefined
            }
            onClick={() => {
              if (soldOutChange.kind === "locations") {
                setSoldOutLocations.mutate({ data: { itemId: item.id, body: soldOutChange.body } });
                return;
              }
              setSoldOut.mutate({
                data: { itemId: item.id, body: toMenuItemBody(item, categoryId, { isAvailable: soldOutChange.isAvailable, countryId: country?.id }) },
              });
            }}
          >
            {soldOutHere ? "Back on" : "Sold out"}
          </Button>
          </div>
        ) : null}
        {hasCatalogControls ? (
          <div className="flex shrink-0 items-center gap-1">
            {access.canSetLocations && (showsLocationsControl || locationsPending) ? (
              <>
                <PowerMark power="company:menu:locations:update" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Locations"
                  title="Locations"
                  disabled={locationsPending}
                  onClick={() => setIsChoosingLocations(true)}
                >
                  <MapPin />
                </Button>
              </>
            ) : null}
            {access.canReorderItems ? (
              <>
                <PowerMark power="company:menu:items:reorder" />
                <Button variant="ghost" size="icon-sm" aria-label="Move up" title="Move up" disabled={isFirst} onClick={() => onMove(-1)}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move down" title="Move down" disabled={isLast} onClick={() => onMove(1)}>
                  <ArrowDown />
                </Button>
              </>
            ) : null}
            {access.canUpdateItem ? (
              <>
                <PowerMark power="company:menu:items:update" />
                <Button variant="ghost" size="icon-sm" aria-label="Edit item" title="Edit" onClick={() => setIsEditing(true)}>
                  <Pencil />
                </Button>
              </>
            ) : null}
            {canManageImages ? (
              <Button variant="ghost" size="icon-sm" aria-label="Photos" title="Photos" onClick={() => setIsPhotosOpen(true)}>
                <Image />
              </Button>
            ) : null}
            {access.canDeleteItem ? (
              <>
                <PowerMark power="company:menu:items:delete" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete item"
                  title="Delete"
                  disabled={removeItem.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete "${item.name}"?`)) removeItem.mutate({ data: { itemId: item.id } });
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {item.description ? <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p> : null}
      {canManageImages ? (
        <MenuItemImages
          itemName={item.name}
          images={item.images}
          open={isPhotosOpen}
          onOpenChange={(open) => {
            if (!open) void reorderImages.flush();
            setIsPhotosOpen(open);
          }}
          isPending={addImages.isPending || removeImage.isPending || setCover.isPending}
          isUploading={addImages.isPending}
          error={firstMutationError(addImages, removeImage, setCover, reorderImages)}
          onAdd={(files) => {
            void reorderImages.flush().then(() => {
              const form = new FormData();
              form.append("itemId", item.id);
              for (const file of files) form.append("files", file);
              addImages.mutate({ data: form });
            });
          }}
          onCover={(imageId) => {
            void reorderImages.flush().then(() => setCover.mutate({ data: { itemId: item.id, imageId } }));
          }}
          onMove={(imageId, direction) => {
            const ids = moveId(
              item.images.map((image) => image.id),
              imageId,
              direction,
            );
            reorderImages.mutate({ data: { itemId: item.id, ids } });
          }}
          onDelete={(imageId) => {
            void reorderImages.flush().then(() => removeImage.mutate({ data: { itemId: item.id, imageId } }));
          }}
          access={access}
        />
      ) : null}
      {country && canSetCountryPrice ? (
        <MenuItemCountrySold
          item={item}
          countryLabel={countryLabel(country)}
          currency={country.currency}
          isPending={setCountryPrice.isPending}
          error={setCountryPrice.isError ? setCountryPrice.error.message : null}
          onSetSold={(isSold) => setCountryPrice.mutate({ data: { itemId: item.id, countryId: country.id, body: toSoldBody(isSold) } })}
          onSetPrice={(price) => setCountryPrice.mutate({ data: { itemId: item.id, countryId: country.id, body: toPriceEntryBody(price) } })}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {muted && !canSetCountryPrice && country ? <Badge variant="outline">Not sold in {countryLabel(country)}</Badge> : null}
        {item.isAvailable ? null : <Badge variant="outline">Not available</Badge>}
        {soldNowhere ? <Badge variant="destructive">Not sold at any open location</Badge> : null}
        {locationsLoaded && item.availableAtAllLocations && locationNames.length > 0 ? (
          <Badge variant="outline">Sold out at {locationNames.join(", ")}</Badge>
        ) : null}
        {hasSeveralLocations && !item.availableAtAllLocations && !soldNowhere ? (
          <Badge variant="outline">Only at {locationNames.join(", ")}</Badge>
        ) : null}
        {item.dietaryTags.map((slug) => (
          <Badge key={slug} variant="secondary">
            {dietaryTags.find((tag) => tag.slug === slug)?.label ?? slug}
          </Badge>
        ))}
      </div>
      {setSoldOut.isError ? <p className="text-xs text-destructive">{setSoldOut.error.message}</p> : null}
      {setSoldOutLocations.isError ? <p className="text-xs text-destructive">{setSoldOutLocations.error.message}</p> : null}
      {updateItem.isError ? <p className="text-xs text-destructive">{updateItem.error.message}</p> : null}
    </li>
  );
}
