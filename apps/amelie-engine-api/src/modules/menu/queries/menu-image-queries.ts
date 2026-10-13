import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { tenantMenuItemImages, tenantMenuItems } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { MENU_ITEM_IMAGE_NOT_FOUND, MENU_ITEM_NOT_FOUND } from "#/modules/menu/constants";
import type { MenuItemImageRecord } from "#/modules/menu/types";

const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

export const getMenuItemImageRowEffect = (
  db: DbConnectType,
  imageId: string,
): Effect.Effect<{ id: string; objectKey: string; contentType: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .select({
          id: tenantMenuItemImages.id,
          objectKey: tenantMenuItemImages.objectKey,
          contentType: tenantMenuItemImages.contentType,
        })
        .from(tenantMenuItemImages)
        .where(eq(tenantMenuItemImages.id, imageId)),
    );
    if (!row) return yield* new NotFound({ message: MENU_ITEM_IMAGE_NOT_FOUND });
    return row;
  });

export const requireMenuItemEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
): Effect.Effect<void, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .select({ id: tenantMenuItems.id })
        .from(tenantMenuItems)
        .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId))),
    );
    if (!row) return yield* new NotFound({ message: MENU_ITEM_NOT_FOUND });
  });

export const countMenuItemImagesEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
): Effect.Effect<number, DbError> =>
  query(async () => {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tenantMenuItemImages)
      .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.menuItemId, itemId)));
    return row?.n ?? 0;
  });

export const nextMenuItemImageSortEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
): Effect.Effect<number, DbError> =>
  query(async () => {
    const [row] = await db
      .select({ sortOrder: tenantMenuItemImages.sortOrder })
      .from(tenantMenuItemImages)
      .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.menuItemId, itemId)))
      .orderBy(desc(tenantMenuItemImages.sortOrder))
      .limit(1);
    return row ? row.sortOrder + 1 : 0;
  });

export const insertMenuItemImageEffect = (
  db: DbConnectType,
  values: {
    id: string;
    tenantId: string;
    menuItemId: string;
    objectKey: string;
    name: string;
    contentType: string;
    size: number;
    sortOrder: number;
  },
): Effect.Effect<MenuItemImageRecord, DbError> =>
  query(async () => {
    const [row] = await db
      .insert(tenantMenuItemImages)
      .values(values)
      .returning({
        id: tenantMenuItemImages.id,
        name: tenantMenuItemImages.name,
        contentType: tenantMenuItemImages.contentType,
        size: tenantMenuItemImages.size,
        sortOrder: tenantMenuItemImages.sortOrder,
      });
    return row;
  });

export const getOwnedMenuItemImageEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  imageId: string,
): Effect.Effect<{ id: string; objectKey: string }, DbError | NotFound> =>
  Effect.gen(function* () {
    const [row] = yield* query(() =>
      db
        .select({ id: tenantMenuItemImages.id, objectKey: tenantMenuItemImages.objectKey })
        .from(tenantMenuItemImages)
        .where(
          and(
            eq(tenantMenuItemImages.tenantId, tenantId),
            eq(tenantMenuItemImages.menuItemId, itemId),
            eq(tenantMenuItemImages.id, imageId),
          ),
        ),
    );
    if (!row) return yield* new NotFound({ message: MENU_ITEM_IMAGE_NOT_FOUND });
    return row;
  });

const listItemImageRows = (
  tx: Pick<DbConnectType, "select">,
  tenantId: string,
  itemId: string,
) =>
  tx
    .select({
      id: tenantMenuItemImages.id,
      name: tenantMenuItemImages.name,
      contentType: tenantMenuItemImages.contentType,
      size: tenantMenuItemImages.size,
    })
    .from(tenantMenuItemImages)
    .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.menuItemId, itemId)))
    .orderBy(asc(tenantMenuItemImages.sortOrder), asc(tenantMenuItemImages.id));

const writeItemImageOrder = async (
  tx: Pick<DbConnectType, "update">,
  tenantId: string,
  itemId: string,
  rows: Array<{ id: string; name: string; contentType: string; size: number }>,
  ordered: ReadonlyArray<string>,
): Promise<MenuItemImageRecord[]> => {
  await tx
    .update(tenantMenuItemImages)
    .set({ sortOrder: sql`${tenantMenuItemImages.sortOrder} + 1000` })
    .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.menuItemId, itemId)));
  for (const [index, id] of ordered.entries()) {
    await tx
      .update(tenantMenuItemImages)
      .set({ sortOrder: index })
      .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.id, id)));
  }
  return ordered.flatMap((id, sortOrder) => {
    const row = rows.find((entry) => entry.id === id);
    return row ? [{ ...row, sortOrder }] : [];
  });
};

export const setMenuItemImageOrderEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<MenuItemImageRecord[], DbError> =>
  query(() =>
    db.transaction(async (tx) => {
      const rows = await listItemImageRows(tx, tenantId, itemId);
      return writeItemImageOrder(tx, tenantId, itemId, rows, ids);
    }),
  );

export const setMenuItemImageCoverEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  imageId: string,
): Effect.Effect<MenuItemImageRecord[], DbError | NotFound> =>
  query(async () => {
    return db.transaction(async (tx) => {
      const rows = await listItemImageRows(tx, tenantId, itemId);
      if (!rows.some((row) => row.id === imageId)) return null;
      const ordered = [imageId, ...rows.map((row) => row.id).filter((id) => id !== imageId)];
      return writeItemImageOrder(tx, tenantId, itemId, rows, ordered);
    });
  }).pipe(
    Effect.flatMap((rows) => (rows ? Effect.succeed(rows) : Effect.fail(new NotFound({ message: MENU_ITEM_IMAGE_NOT_FOUND })))),
  );

export const deleteMenuItemImageRowEffect = (
  db: DbConnectType,
  tenantId: string,
  imageId: string,
): Effect.Effect<void, DbError> =>
  query(async () => {
    await db
      .delete(tenantMenuItemImages)
      .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.id, imageId)));
  });

export const listMenuItemImageObjectKeysEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
): Effect.Effect<string[], DbError> =>
  query(async () => {
    const rows = await db
      .select({ objectKey: tenantMenuItemImages.objectKey })
      .from(tenantMenuItemImages)
      .where(and(eq(tenantMenuItemImages.tenantId, tenantId), eq(tenantMenuItemImages.menuItemId, itemId)));
    return rows.map((row) => row.objectKey);
  });

export const listMenuItemImagesByItemEffect = (
  db: DbConnectType,
  tenantId: string,
  itemIds: ReadonlyArray<string>,
): Effect.Effect<Map<string, MenuItemImageRecord[]>, DbError> =>
  itemIds.length === 0
    ? Effect.succeed(new Map())
    : query(async () => {
        const rows = await db
          .select({
            menuItemId: tenantMenuItemImages.menuItemId,
            id: tenantMenuItemImages.id,
            name: tenantMenuItemImages.name,
            contentType: tenantMenuItemImages.contentType,
            size: tenantMenuItemImages.size,
            sortOrder: tenantMenuItemImages.sortOrder,
          })
          .from(tenantMenuItemImages)
          .where(
            and(eq(tenantMenuItemImages.tenantId, tenantId), inArray(tenantMenuItemImages.menuItemId, [...itemIds])),
          )
          .orderBy(asc(tenantMenuItemImages.sortOrder), asc(tenantMenuItemImages.id));
        const byItem = new Map<string, MenuItemImageRecord[]>();
        for (const row of rows) {
          const images = byItem.get(row.menuItemId) ?? [];
          images.push({
            id: row.id,
            name: row.name,
            contentType: row.contentType,
            size: row.size,
            sortOrder: row.sortOrder,
          });
          byItem.set(row.menuItemId, images);
        }
        return byItem;
      });
