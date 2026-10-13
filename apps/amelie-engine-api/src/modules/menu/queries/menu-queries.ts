import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  dietaryTags,
  tenantMenuCategories,
  tenantMenuItemDietaryTags,
  tenantMenuItemLocations,
  menuItemPrices,
  tenantCountries,
  tenantMenuItems,
} from "@repo/db-amelie";
import type { MenuItemVariant } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import {
  countryPriceOn,
  menuItemShownAt,
  menuItemSoldInCountry,
} from "./menu-availability";
import { setCountrySoldFlag, upsertCountryPrice } from "./menu-country-price-queries";
import { firstOpenCountryId, openCountryIdsEffect, readCountryIdEffect } from "#/modules/country/queries";
import { MENU_CATEGORY_NOT_FOUND, MENU_ITEM_NOT_FOUND } from "#/modules/menu/constants";
import { menuItemImagePublicPath } from "#/modules/menu/lib";
import { listMenuItemImagesByItemEffect } from "./menu-image-queries";
import type {
  DietaryTagOption,
  MenuCategory,
  MenuItemCard,
  MenuItemLocationsValues,
  MenuItemPricing,
  MenuItemValues,
} from "#/modules/menu/types";

// -----
// Every query here filters on tenant_id;
// the tenantId comes from server context.
// -----
const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

// -----
// Price, Variants and currency come from the Country
// price and the Country (ADR-0002), never the item or
// the Tenant. Null when no Country is in play or the
// item has no price there.
// -----
const priceColumns = {
  price: menuItemPrices.price,
  currency: tenantCountries.currency,
  variants: menuItemPrices.variants,
};

// -----
// What is shown and priced: with a Location, what it
// sells (the shared check); with a countryId and no
// Location, what is sold in that Country. An explicit
// countryId wins for the price; pass a Location only
// when it is in that Country (the chat tools do).
// -----
const shownIn = (
  db: DbConnectType,
  locationId: string | undefined,
  countryId: string | undefined,
  resolved: string | null,
  includeUnsold = false,
  includeUnavailable = false,
) =>
  locationId !== undefined
    ? menuItemShownAt(db, locationId, includeUnavailable)
    : countryId !== undefined && !includeUnsold
      ? menuItemSoldInCountry(db, resolved)
      : undefined;

// -----
// Categories, items and their Dietary
// tags, assembled in sort order. includeUnsold is the
// editor's view of a Country: every item comes back,
// with isSold false and no price when it has no price
// row there, and empty categories stay.
// -----
export const listMenuEffect = (
  db: DbConnectType,
  tenantId: string,
  locationId?: string,
  explicitCountryId?: string,
  includeUnsold = false,
  includeUnavailable = false,
): Effect.Effect<MenuCategory[], DbError> =>
  Effect.gen(function* () {
    const countryId = yield* readCountryIdEffect(db, tenantId, locationId, explicitCountryId);
    const openCountries =
      locationId === undefined && explicitCountryId === undefined ? [] : yield* openCountryIdsEffect(db, tenantId);
    const [categories, items] = yield* Effect.all(
      [
        query(() =>
          db
            .select({ id: tenantMenuCategories.id, name: tenantMenuCategories.name, note: tenantMenuCategories.note })
            .from(tenantMenuCategories)
            .where(eq(tenantMenuCategories.tenantId, tenantId))
            .orderBy(asc(tenantMenuCategories.sortOrder), asc(tenantMenuCategories.name)),
        ),
        query(() =>
          db
            .select({
              id: tenantMenuItems.id,
              categoryId: tenantMenuItems.categoryId,
              name: tenantMenuItems.name,
              description: tenantMenuItems.description,
              ...priceColumns,
              soldHere: sql<boolean>`coalesce(${menuItemPrices.isSold}, false)`,
              isAvailable: tenantMenuItems.isAvailable,
              availableAtAllLocations: tenantMenuItems.availableAtAllLocations,
            })
            .from(tenantMenuItems)
            .leftJoin(menuItemPrices, countryPriceOn(countryId))
            .leftJoin(tenantCountries, eq(tenantCountries.id, menuItemPrices.countryId))
            .where(
              and(
                eq(tenantMenuItems.tenantId, tenantId),
                shownIn(db, locationId, explicitCountryId, countryId, includeUnsold, includeUnavailable),
              ),
            )
            .orderBy(asc(tenantMenuItems.sortOrder), asc(tenantMenuItems.name)),
        ),
      ],
      { concurrency: "unbounded" },
    );
    const tags = items.length
      ? yield* query(() =>
          db
            .select({ menuItemId: tenantMenuItemDietaryTags.menuItemId, slug: dietaryTags.slug })
            .from(tenantMenuItemDietaryTags)
            .innerJoin(dietaryTags, eq(dietaryTags.id, tenantMenuItemDietaryTags.dietaryTagId))
            .where(
              and(
                eq(tenantMenuItemDietaryTags.tenantId, tenantId),
                inArray(
                  tenantMenuItemDietaryTags.menuItemId,
                  items.map((item) => item.id),
                ),
              ),
            )
            .orderBy(asc(dietaryTags.slug)),
        )
      : [];
    const locationRows = items.length
      ? yield* query(() =>
          db
            .select({
              menuItemId: tenantMenuItemLocations.menuItemId,
              locationId: tenantMenuItemLocations.locationId,
              isAvailable: tenantMenuItemLocations.isAvailable,
            })
            .from(tenantMenuItemLocations)
            .where(
              and(
                eq(tenantMenuItemLocations.tenantId, tenantId),
                inArray(
                  tenantMenuItemLocations.menuItemId,
                  items.map((item) => item.id),
                ),
              ),
            ),
        )
      : [];
    // -----
    // A Country's menu shows only categories with an item
    // sold there. A one-Country cafe keeps its empty ones.
    // -----
    const hideEmpty = openCountries.length > 1 && !includeUnsold;
    const imagesByItem = yield* listMenuItemImagesByItemEffect(
      db,
      tenantId,
      items.map((item) => item.id),
    );
    return categories
      .filter((category) => !hideEmpty || items.some((item) => item.categoryId === category.id))
      .map((category) => ({
        ...category,
        items: items
          .filter((item) => item.categoryId === category.id)
          .map(({ categoryId: _categoryId, soldHere, ...item }) => {
            const images = imagesByItem.get(item.id) ?? [];
            const imageId = images[0]?.id;
            return {
              ...item,
              images,
              coverPath: imageId ? menuItemImagePublicPath(imageId) : null,
              isSold: includeUnsold ? soldHere : undefined,
              locationIds: locationRows
                .filter((row) => row.menuItemId === item.id && row.isAvailable !== item.availableAtAllLocations)
                .map((row) => row.locationId)
                .toSorted(),
              dietaryTags: tags.filter((tag) => tag.menuItemId === item.id).map((tag) => tag.slug),
            };
          }),
      }));
  });

// -----
// Only this Tenant's rows match, so a foreign id
// simply returns nothing. With a Location, only
// items sold there (the shared check) come back,
// priced in its Country.
// -----
export const listMenuItemCardsEffect = (
  db: DbConnectType,
  tenantId: string,
  ids: ReadonlyArray<string>,
  locationId?: string,
  explicitCountryId?: string,
): Effect.Effect<MenuItemCard[], DbError> =>
  ids.length === 0
    ? Effect.succeed([])
    : Effect.gen(function* () {
        const countryId = yield* readCountryIdEffect(db, tenantId, locationId, explicitCountryId);
        const rows = yield* query(() =>
          db
            .select({
              id: tenantMenuItems.id,
              name: tenantMenuItems.name,
              ...priceColumns,
            })
            .from(tenantMenuItems)
            .leftJoin(menuItemPrices, countryPriceOn(countryId))
            .leftJoin(tenantCountries, eq(tenantCountries.id, menuItemPrices.countryId))
            .where(
              and(
                eq(tenantMenuItems.tenantId, tenantId),
                inArray(tenantMenuItems.id, [...ids]),
                shownIn(db, locationId, explicitCountryId, countryId),
              ),
            ),
        );
        const imagesByItem = yield* listMenuItemImagesByItemEffect(
          db,
          tenantId,
          rows.map((row) => row.id),
        );
        return rows.map((row) => {
          const imageId = imagesByItem.get(row.id)?.[0]?.id;
          return { ...row, coverPath: imageId ? menuItemImagePublicPath(imageId) : null };
        });
      });

// -----
// The item as the write paths see it: priced in the
// Country they write to (the named one, else the
// first open one).
// -----
export const getMenuItemPricingEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  explicitCountryId?: string,
): Effect.Effect<MenuItemPricing, DbError | NotFound> =>
  Effect.gen(function* () {
    const countryId = explicitCountryId ?? (yield* query(() => firstOpenCountryId(db, tenantId)));
    const [row] = yield* query(() =>
      db
        .select({
          id: tenantMenuItems.id,
          name: tenantMenuItems.name,
          ...priceColumns,
          isAvailable: tenantMenuItems.isAvailable,
        })
        .from(tenantMenuItems)
        .leftJoin(menuItemPrices, countryPriceOn(countryId))
        .leftJoin(tenantCountries, eq(tenantCountries.id, menuItemPrices.countryId))
        .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId))),
    );
    if (!row) return yield* new NotFound({ message: MENU_ITEM_NOT_FOUND });
    return row;
  });

// -----
// Writes: by (tenant, id), so an id from
// another Tenant updates nothing.
// -----
export const updateMenuItemEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  change: { isAvailable: boolean } | { price: string; variants: MenuItemVariant[] | null; countryId?: string },
): Effect.Effect<MenuItemPricing, DbError | NotFound> =>
  Effect.gen(function* () {
    const [updated] = yield* query(() =>
      db.transaction(async (tx) => {
        const rows = await tx
          .update(tenantMenuItems)
          .set("price" in change ? { updatedAt: new Date() } : change)
          .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId)))
          .returning({ id: tenantMenuItems.id });
        if (rows.length > 0 && "price" in change) {
          const countryId = change.countryId ?? (await firstOpenCountryId(tx, tenantId));
          if (countryId) await upsertCountryPrice(tx, tenantId, itemId, countryId, change);
        }
        return rows;
      }),
    );
    if (!updated) return yield* new NotFound({ message: MENU_ITEM_NOT_FOUND });
    return yield* getMenuItemPricingEffect(db, tenantId, itemId, "price" in change ? change.countryId : undefined);
  });

// -----
// The shared list: the one table with no tenant_id.
// -----
export const listDietaryTagsEffect = (db: DbConnectType): Effect.Effect<DietaryTagOption[], DbError> =>
  query(() =>
    db.select({ slug: dietaryTags.slug, label: dietaryTags.label }).from(dietaryTags).orderBy(asc(dietaryTags.label)),
  );

// -----
// Category writes. A new one goes last; deleting
// one deletes its items (the database cascades).
// -----
const categoryColumns = {
  id: tenantMenuCategories.id,
  name: tenantMenuCategories.name,
  note: tenantMenuCategories.note,
};

export const insertMenuCategoryEffect = (
  db: DbConnectType,
  tenantId: string,
  values: { name: string; note: string | null },
): Effect.Effect<{ id: string; name: string; note: string | null }, DbError> =>
  query(() =>
    db
      .insert(tenantMenuCategories)
      .values({
        tenantId,
        ...values,
        sortOrder: sql`(select coalesce(max(sort_order), 0) + 1 from tenant_menu_categories where tenant_id = ${tenantId})`,
      })
      .returning(categoryColumns),
  ).pipe(Effect.map(([row]) => row));

export const updateMenuCategoryEffect = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
  values: { name: string; note: string | null },
): Effect.Effect<{ id: string; name: string; note: string | null }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .update(tenantMenuCategories)
        .set(values)
        .where(and(eq(tenantMenuCategories.tenantId, tenantId), eq(tenantMenuCategories.id, categoryId)))
        .returning(categoryColumns),
    );
    if (!row) return yield* new NotFound({ message: MENU_CATEGORY_NOT_FOUND });
    return row;
  });

export const deleteMenuCategoryEffect = (
  db: DbConnectType,
  tenantId: string,
  categoryId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .delete(tenantMenuCategories)
        .where(and(eq(tenantMenuCategories.tenantId, tenantId), eq(tenantMenuCategories.id, categoryId)))
        .returning({ id: tenantMenuCategories.id }),
    );
    if (!row) return yield* new NotFound({ message: MENU_CATEGORY_NOT_FOUND });
    return row;
  });

// -----
// One transaction: the order is all or nothing.
// -----
export const setMenuCategoryOrderEffect = (
  db: DbConnectType,
  tenantId: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<void, DbError> =>
  query(() =>
    db.transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx
          .update(tenantMenuCategories)
          .set({ sortOrder: index })
          .where(and(eq(tenantMenuCategories.tenantId, tenantId), eq(tenantMenuCategories.id, id)));
      }
    }),
  );

export const setMenuItemOrderEffect = (
  db: DbConnectType,
  tenantId: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<void, DbError> =>
  query(() =>
    db.transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx
          .update(tenantMenuItems)
          .set({ sortOrder: index })
          .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, id)));
      }
    }),
  );

// -----
// Item writes: the row and its Dietary tags change
// together. The service has checked the slugs.
// -----
const replaceItemTags = async (
  tx: Pick<DbConnectType, "delete" | "insert" | "select">,
  tenantId: string,
  itemId: string,
  slugs: ReadonlyArray<string>,
): Promise<void> => {
  await tx
    .delete(tenantMenuItemDietaryTags)
    .where(and(eq(tenantMenuItemDietaryTags.tenantId, tenantId), eq(tenantMenuItemDietaryTags.menuItemId, itemId)));
  if (slugs.length === 0) return;
  const tags = await tx.select({ id: dietaryTags.id }).from(dietaryTags).where(inArray(dietaryTags.slug, [...slugs]));
  await tx
    .insert(tenantMenuItemDietaryTags)
    .values(tags.map((tag) => ({ tenantId, menuItemId: itemId, dietaryTagId: tag.id })));
};

export const insertMenuItemEffect = (
  db: DbConnectType,
  tenantId: string,
  values: MenuItemValues,
  tagSlugs: ReadonlyArray<string>,
): Effect.Effect<{ id: string }, DbError> =>
  query(() =>
    db.transaction(async (tx) => {
      const { priced, countryId, isSold, ...item } = values;
      const [row] = await tx
        .insert(tenantMenuItems)
        .values({
          tenantId,
          ...item,
          sortOrder: sql`(select coalesce(max(sort_order), 0) + 1 from tenant_menu_items where tenant_id = ${tenantId} and category_id = ${values.categoryId})`,
        })
        .returning({ id: tenantMenuItems.id });
      if (priced) await upsertCountryPrice(tx, tenantId, row.id, countryId, priced, isSold);
      await replaceItemTags(tx, tenantId, row.id, tagSlugs);
      return row;
    }),
  );

export const updateMenuItemFullEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  values: MenuItemValues,
  tagSlugs: ReadonlyArray<string>,
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  query(() =>
    db.transaction(async (tx) => {
      const { priced, countryId, isSold, ...item } = values;
      const [row] = await tx
        .update(tenantMenuItems)
        .set(item)
        .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId)))
        .returning({ id: tenantMenuItems.id });
      if (!row) return null;
      if (priced) await upsertCountryPrice(tx, tenantId, itemId, countryId, priced, isSold);
      else if (isSold !== undefined) await setCountrySoldFlag(tx, tenantId, itemId, countryId, isSold);
      await replaceItemTags(tx, tenantId, itemId, tagSlugs);
      return row;
    }),
  ).pipe(
    Effect.flatMap((row) => (row ? Effect.succeed(row) : Effect.fail(new NotFound({ message: MENU_ITEM_NOT_FOUND })))),
  );

export const deleteMenuItemEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .delete(tenantMenuItems)
        .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId)))
        .returning({ id: tenantMenuItems.id }),
    );
    if (!row) return yield* new NotFound({ message: MENU_ITEM_NOT_FOUND });
    return row;
  });

// -----
// The flag and the Location rows change together:
// sold-out rows for an all-Locations item, sold
// rows for any other.
// -----
export const setMenuItemLocationsEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  { availableAtAllLocations, locationIds }: MenuItemLocationsValues,
): Effect.Effect<{ id: string }, DbError | NotFound> =>
  query(() =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(tenantMenuItems)
        .set({ availableAtAllLocations })
        .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId)))
        .returning({ id: tenantMenuItems.id });
      if (!row) return null;
      await tx
        .delete(tenantMenuItemLocations)
        .where(and(eq(tenantMenuItemLocations.tenantId, tenantId), eq(tenantMenuItemLocations.menuItemId, itemId)));
      if (locationIds.length > 0) {
        await tx.insert(tenantMenuItemLocations).values(
          locationIds.map((locationId) => ({
            tenantId,
            menuItemId: itemId,
            locationId,
            isAvailable: !availableAtAllLocations,
          })),
        );
      }
      return row;
    }),
  ).pipe(
    Effect.flatMap((row) => (row ? Effect.succeed(row) : Effect.fail(new NotFound({ message: MENU_ITEM_NOT_FOUND })))),
  );
