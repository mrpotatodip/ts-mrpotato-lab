import { Effect } from "effect";
import { z } from "zod";
import type { Coverage } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { Invalid, NotFound, type DbError } from "#/lib/effect-query";
import {
  deleteMenuCategoryEffect,
  deleteMenuItemEffect,
  getMenuItemPricingEffect,
  insertMenuCategoryEffect,
  insertMenuItemEffect,
  listDietaryTagsEffect,
  listMenuEffect,
  listMenuItemCardsEffect,
  setCountryPriceEffect,
  setMenuCategoryOrderEffect,
  setMenuItemLocationsEffect,
  setMenuItemOrderEffect,
  updateMenuCategoryEffect,
  updateMenuItemEffect,
  updateMenuItemFullEffect,
} from "#/modules/menu/queries";
import { findMenuItems } from "#/modules/menu/lib";
import type { MenuItemVariant, SetMenuItemCountryPriceBody } from "@repo/contracts/amelie";
import { chooseCountryIdSvc } from "#/modules/country/handlers";
import { COUNTRY_NOT_FOUND } from "#/modules/country/constants";
import { listOpenCountryRefsEffect } from "#/modules/country/queries";
import { listActiveLocationsEffect } from "#/modules/location/queries";
import {
  MENU_CATEGORY_NOT_FOUND,
  MENU_COUNTRY_PRICE_REQUIRED,
  MENU_DIETARY_TAG_UNKNOWN,
  MENU_ITEM_HAS_NO_VARIANTS,
  MENU_ITEM_NOT_FOUND,
  MENU_LOCATION_NOT_FOUND,
  MENU_LOCATIONS_REQUIRED,
  MENU_ORDER_MISMATCH,
  MENU_VARIANT_NOT_FOUND,
  MENU_VARIANT_REQUIRED,
} from "#/modules/menu/constants";
import type {
  DietaryTagOption,
  MenuCategory,
  MenuItem,
  MenuItemCard,
  MenuItemLocationsValues,
  MenuItemMatch,
  MenuItemPricing,
  MenuItemValues,
} from "#/modules/menu/types";

const isUuid = (id: string) => z.uuid().safeParse(id).success;
const toPrice = (amount: number) => amount.toFixed(2);

// -----
// With a Location, only what is shown there.
// Without one, the whole Tenant menu.
// -----
export const listMenuSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
  countryId?: string,
  includeUnavailable = false,
): Effect.Effect<MenuCategory[], DbError> =>
  listMenuEffect(db, tenantId, locationId, countryId, false, includeUnavailable);

export const searchMenuSvc = (
  db: DbConnectType,
  tenantId: string,
  search: { text: string | null; dietaryTag: string | null },
  locationId?: string,
  countryId?: string,
  includeUnavailable = false,
): Effect.Effect<MenuItemMatch[], DbError> =>
  listMenuEffect(db, tenantId, locationId, countryId, false, includeUnavailable).pipe(
    Effect.map((menu) => findMenuItems(menu, search)),
  );

// -----
// A made-up id is dropped, not an error, so
// one bad id can't hide the real cards.
// -----
export const getMenuItemCardsSvc = (
  db: DbConnectType,
  tenantId: string,
  ids: ReadonlyArray<string>,
  locationId?: string,
  countryId?: string,
): Effect.Effect<MenuItemCard[], DbError> =>
  listMenuItemCardsEffect(db, tenantId, [...new Set(ids)].filter(isUuid), locationId, countryId).pipe(
    Effect.map((cards) => [...new Set(ids)].flatMap((id) => cards.filter((card) => card.id === id))),
  );

export const setMenuItemAvailabilitySvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  isAvailable: boolean,
): Effect.Effect<MenuItemPricing, DbError | NotFound> =>
  updateMenuItemEffect(db, tenantId, itemId, { isAvailable });

// -----
// With Variants, the item's price stays the
// lowest Variant price, as the schema says. A
// countryId limits the change to that Country's
// price row (the caller has checked it is open);
// without one it is the first open Country.
// -----
export const updateMenuItemPriceSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  { variantName, price, countryId }: { variantName: string | null; price: number; countryId?: string },
): Effect.Effect<MenuItemPricing, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    const item = yield* getMenuItemPricingEffect(db, tenantId, itemId, countryId);
    const variants = item.variants ?? [];
    if (variants.length === 0) {
      if (variantName !== null) return yield* new Invalid({ message: MENU_ITEM_HAS_NO_VARIANTS });
      return yield* updateMenuItemEffect(db, tenantId, itemId, { price: toPrice(price), variants: null, countryId });
    }
    if (variantName === null) return yield* new Invalid({ message: MENU_VARIANT_REQUIRED });
    const wanted = variantName.trim().toLowerCase();
    if (!variants.some((v) => v.name.toLowerCase() === wanted)) {
      return yield* new Invalid({ message: MENU_VARIANT_NOT_FOUND });
    }
    const updated = variants.map((v) => (v.name.toLowerCase() === wanted ? { ...v, price: toPrice(price) } : v));
    const lowest = Math.min(...updated.map((v) => Number(v.price)));
    return yield* updateMenuItemEffect(db, tenantId, itemId, { price: toPrice(lowest), variants: updated, countryId });
  });

// -----
// The dashboard's menu: every category with its
// items, and the shared Dietary tags to choose from.
// -----
export const getMenuEditorSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
  countryId?: string,
): Effect.Effect<{ categories: MenuCategory[]; dietaryTags: DietaryTagOption[] }, DbError | NotFound> =>
  Effect.gen(function* () {
    if (locationId !== undefined) yield* checkActiveLocations(db, tenantId, [locationId]);
    if (countryId !== undefined) yield* checkOpenCountry(db, tenantId, countryId);
    return yield* Effect.all(
      {
        categories: listMenuEffect(db, tenantId, locationId, countryId, countryId !== undefined),
        dietaryTags: listDietaryTagsEffect(db),
      },
      { concurrency: "unbounded" },
    );
  });

// -----
// An unknown, foreign or archived Country is not
// found, never an empty menu.
// -----
const checkOpenCountry = (db: DbConnectType, tenantId: string, countryId: string) =>
  listOpenCountryRefsEffect(db, tenantId).pipe(
    Effect.flatMap((open) =>
      open.some((country) => country.id === countryId)
        ? Effect.void
        : Effect.fail(new NotFound({ message: COUNTRY_NOT_FOUND })),
    ),
  );

// -----
// The Locations must be this Tenant's active
// ones, checked here so the dashboard hears why.
// -----
const checkActiveLocations = (db: DbConnectType, tenantId: string, locationIds: ReadonlyArray<string>) =>
  listActiveLocationsEffect(db, tenantId).pipe(
    Effect.flatMap((active) =>
      locationIds.every((id) => active.some((location) => location.id === id))
        ? Effect.void
        : Effect.fail(new NotFound({ message: MENU_LOCATION_NOT_FOUND })),
    ),
  );

const mergeUncoveredLocations = (
  values: MenuItemLocationsValues,
  current: Pick<MenuItem, "availableAtAllLocations" | "locationIds">,
  coverage: Exclude<Coverage, "all">,
  activeIds: ReadonlyArray<string>,
): MenuItemLocationsValues => {
  const rows = new Set(current.locationIds);
  const wasSelling = (id: string) => (current.availableAtAllLocations ? !rows.has(id) : rows.has(id));
  const uncovered = [...new Set([...activeIds, ...current.locationIds])].filter((id) => !coverage.includes(id));
  const kept = uncovered.filter((id) => wasSelling(id) !== values.availableAtAllLocations);
  return { ...values, locationIds: [...values.locationIds, ...kept] };
};

export const setMenuItemLocationsSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  values: MenuItemLocationsValues,
  coverage: Coverage = "all",
): Effect.Effect<MenuItem, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    if (!values.availableAtAllLocations && values.locationIds.length === 0) {
      return yield* new Invalid({ message: MENU_LOCATIONS_REQUIRED });
    }
    yield* checkActiveLocations(db, tenantId, values.locationIds);
    if (coverage === "all") {
      yield* setMenuItemLocationsEffect(db, tenantId, itemId, values);
    } else {
      const current = yield* findMenuItem(db, tenantId, itemId);
      const active = yield* listActiveLocationsEffect(db, tenantId);
      const merged = mergeUncoveredLocations(
        values,
        current,
        coverage,
        active.map((location) => location.id),
      );
      yield* setMenuItemLocationsEffect(db, tenantId, itemId, merged);
    }
    return yield* findMenuItem(db, tenantId, itemId);
  });

export const addMenuCategorySvc = (
  db: DbConnectType,
  tenantId: string,
  values: { name: string; note: string | null },
): Effect.Effect<{ id: string; name: string; note: string | null }, DbError> =>
  insertMenuCategoryEffect(db, tenantId, values);

export const updateMenuCategorySvc = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
  values: { name: string; note: string | null },
): Effect.Effect<{ id: string; name: string; note: string | null }, DbError | NotFound> =>
  updateMenuCategoryEffect(db, tenantId, categoryId, values);

export const deleteMenuCategorySvc = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> => deleteMenuCategoryEffect(db, tenantId, categoryId);

// -----
// The order must be a re-ordering of this Tenant's
// own ids, never a way to touch another's rows.
// -----
const checkSameIds = (own: ReadonlyArray<string>, ids: ReadonlyArray<string>) =>
  ids.length === own.length && new Set(ids).size === ids.length && ids.every((id) => own.includes(id))
    ? Effect.void
    : Effect.fail(new Invalid({ message: MENU_ORDER_MISMATCH }));

export const reorderMenuCategoriesSvc = (
  db: DbConnectType,
  tenantId: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<MenuCategory[], DbError | Invalid> =>
  listMenuEffect(db, tenantId).pipe(
    Effect.flatMap((categories) =>
      checkSameIds(categories.map((c) => c.id), ids).pipe(Effect.andThen(setMenuCategoryOrderEffect(db, tenantId, ids))),
    ),
    Effect.andThen(listMenuEffect(db, tenantId)),
  );

export const reorderMenuItemsSvc = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<MenuCategory[], DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    const categories = yield* listMenuEffect(db, tenantId);
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return yield* new NotFound({ message: MENU_CATEGORY_NOT_FOUND });
    yield* checkSameIds(category.items.map((item) => item.id), ids);
    yield* setMenuItemOrderEffect(db, tenantId, ids);
    return yield* listMenuEffect(db, tenantId);
  });

// -----
// With Variants, the item's price is the lowest
// Variant price, as the schema says.
// -----
type MenuItemInput = Omit<MenuItemValues, "priced" | "countryId"> & {
  price: string | null;
  variants: MenuItemVariant[] | null;
  dietaryTags: string[];
  countryId?: string;
};

const toItemValues = (
  { dietaryTags: _tags, price, variants, ...item }: MenuItemInput,
  countryId: string,
): MenuItemValues => ({
  ...item,
  countryId,
  priced: variants
    ? { price: toPrice(Math.min(...variants.map((v) => Number(v.price)))), variants }
    : price === null
      ? null
      : { price, variants: null },
});

const checkItemReferences = (db: DbConnectType, tenantId: string, item: MenuItemInput) =>
  Effect.gen(function* () {
    const [categories, tags] = yield* Effect.all(
      [listMenuEffect(db, tenantId), listDietaryTagsEffect(db)],
      { concurrency: "unbounded" },
    );
    if (!categories.some((c) => c.id === item.categoryId)) {
      return yield* new Invalid({ message: MENU_CATEGORY_NOT_FOUND });
    }
    if (!item.dietaryTags.every((slug) => tags.some((tag) => tag.slug === slug))) {
      return yield* new Invalid({ message: MENU_DIETARY_TAG_UNKNOWN });
    }
  });

const findMenuItem = (db: DbConnectType, tenantId: string, itemId: string, countryId?: string) =>
  listMenuEffect(db, tenantId, undefined, countryId, countryId !== undefined).pipe(
    Effect.flatMap((categories) => {
      const item = categories.flatMap((c) => c.items).find((i) => i.id === itemId);
      return item ? Effect.succeed(item) : Effect.fail(new NotFound({ message: MENU_ITEM_NOT_FOUND }));
    }),
  );

export const addMenuItemSvc = (
  db: DbConnectType,
  tenantId: string,
  item: MenuItemInput,
): Effect.Effect<MenuItem, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    const countryId = yield* chooseCountryIdSvc(db, tenantId, item.countryId);
    yield* checkItemReferences(db, tenantId, item);
    const values = toItemValues(item, countryId);
    if (values.priced === null) return yield* new Invalid({ message: MENU_COUNTRY_PRICE_REQUIRED });
    const { id } = yield* insertMenuItemEffect(db, tenantId, values, item.dietaryTags);
    return yield* findMenuItem(db, tenantId, id, countryId);
  });

export const updateMenuItemSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  item: MenuItemInput,
): Effect.Effect<MenuItem, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    const countryId = yield* chooseCountryIdSvc(db, tenantId, item.countryId);
    yield* checkItemReferences(db, tenantId, item);
    yield* updateMenuItemFullEffect(db, tenantId, itemId, toItemValues(item, countryId), item.dietaryTags);
    return yield* findMenuItem(db, tenantId, itemId, countryId);
  });

// -----
// One item's price and sold-here flag in one named
// Country (the dashboard's price entry and toggle).
// With no price in the body only the flag changes, so
// turning sold-here off keeps the price.
// -----
export const setMenuItemCountryPriceSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  countryId: string,
  body: SetMenuItemCountryPriceBody,
): Effect.Effect<MenuItem, DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    yield* checkOpenCountry(db, tenantId, countryId);
    const priced =
      body.variants || body.price
        ? {
            price: body.variants ? toPrice(Math.min(...body.variants.map((v) => Number(v.price)))) : (body.price ?? "0.00"),
            variants: body.variants ?? null,
          }
        : null;
    const outcome = yield* setCountryPriceEffect(db, tenantId, itemId, countryId, { isSold: body.isSold, priced });
    if (outcome === "no-item") return yield* new NotFound({ message: MENU_ITEM_NOT_FOUND });
    if (outcome === "no-price") return yield* new Invalid({ message: MENU_COUNTRY_PRICE_REQUIRED });
    return yield* findMenuItem(db, tenantId, itemId, countryId);
  });

export const deleteMenuItemSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> => deleteMenuItemEffect(db, tenantId, itemId);

export const listDietaryTagsSvc = (db: DbConnectType): Effect.Effect<DietaryTagOption[], DbError> =>
  listDietaryTagsEffect(db);
