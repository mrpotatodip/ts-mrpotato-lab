import { Effect } from "effect";
import { IMPORT_IMAGE_TYPES, IMPORT_MAX_FILE_BYTES, MENU_ITEM_IMAGE_MAX } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { ExternalError, Invalid, NotFound, type DbError } from "#/lib/effect-query";
import {
  MENU_ITEM_IMAGE_FILE_TOO_LARGE,
  MENU_ITEM_IMAGE_NO_FILE,
  MENU_ITEM_IMAGE_NOT_FOUND,
  MENU_ITEM_IMAGE_TOO_MANY,
  MENU_ITEM_IMAGE_TYPE_REFUSED,
  MENU_ORDER_MISMATCH,
} from "#/modules/menu/constants";
import { menuItemImageObjectKey } from "#/modules/menu/lib";
import {
  countMenuItemImagesEffect,
  deleteMenuCategoryEffect,
  deleteMenuItemEffect,
  deleteMenuItemImageRowEffect,
  getMenuItemImageRowEffect,
  getOwnedMenuItemImageEffect,
  insertMenuItemImageEffect,
  listMenuItemImageObjectKeysEffect,
  listMenuItemImageObjectKeysForCategoryEffect,
  listMenuItemImagesByItemEffect,
  nextMenuItemImageSortEffect,
  requireMenuItemEffect,
  setMenuItemImageCoverEffect,
  setMenuItemImageOrderEffect,
} from "#/modules/menu/queries";
import type { MenuImageStorage, MenuItemImageBytes, MenuItemImageFile, MenuItemImageRecord } from "#/modules/menu/types";

const store = <A>(run: () => Promise<A>): Effect.Effect<A, ExternalError> =>
  Effect.tryPromise({ try: run, catch: (cause) => new ExternalError({ cause }) });

const dropStored = (
  storage: Pick<MenuImageStorage, "delete">,
  keys: ReadonlyArray<string>,
): Effect.Effect<void, ExternalError> =>
  Effect.forEach(keys, (key) => store(() => storage.delete(key)), { concurrency: "unbounded" }).pipe(Effect.asVoid);

const checkImageFile = (file: MenuItemImageFile): string | null => {
  if (!IMPORT_IMAGE_TYPES.some((type) => type === file.contentType)) {
    return MENU_ITEM_IMAGE_TYPE_REFUSED;
  }
  if (file.bytes.byteLength > IMPORT_MAX_FILE_BYTES) return MENU_ITEM_IMAGE_FILE_TOO_LARGE;
  if (file.bytes.byteLength === 0) return MENU_ITEM_IMAGE_NO_FILE;
  return null;
};

export const getMenuItemImageBytesSvc = (
  db: DbConnectType,
  storage: MenuImageStorage,
  imageId: string,
): Effect.Effect<MenuItemImageBytes, DbError | NotFound | ExternalError> =>
  Effect.gen(function* () {
    const row = yield* getMenuItemImageRowEffect(db, imageId);
    const bytes = yield* store(() => storage.get(row.objectKey));
    if (!bytes) return yield* new NotFound({ message: MENU_ITEM_IMAGE_NOT_FOUND });
    return { contentType: row.contentType, bytes };
  });

export const addMenuItemImagesSvc = (
  db: DbConnectType,
  storage: MenuImageStorage,
  tenantId: string,
  itemId: string,
  files: ReadonlyArray<MenuItemImageFile>,
): Effect.Effect<MenuItemImageRecord[], DbError | NotFound | Invalid | ExternalError> =>
  Effect.gen(function* () {
    if (files.length === 0) return yield* new Invalid({ message: MENU_ITEM_IMAGE_NO_FILE });
    for (const file of files) {
      const refused = checkImageFile(file);
      if (refused) return yield* new Invalid({ message: refused });
    }
    yield* requireMenuItemEffect(db, tenantId, itemId);
    const count = yield* countMenuItemImagesEffect(db, tenantId, itemId);
    if (count + files.length > MENU_ITEM_IMAGE_MAX) return yield* new Invalid({ message: MENU_ITEM_IMAGE_TOO_MANY });
    const sortOrder = yield* nextMenuItemImageSortEffect(db, tenantId, itemId);
    const planned = files.map((file, index) => {
      const imageId = crypto.randomUUID();
      return {
        id: imageId,
        tenantId,
        menuItemId: itemId,
        objectKey: menuItemImageObjectKey(tenantId, itemId, imageId, file.name),
        name: file.name,
        contentType: file.contentType,
        size: file.bytes.byteLength,
        sortOrder: sortOrder + index,
        bytes: file.bytes,
      };
    });
    const keys = planned.map((row) => row.objectKey);
    const rollback = () => dropStored(storage, keys);
    yield* Effect.forEach(planned, (row) => store(() => storage.put(row.objectKey, row.bytes, row.contentType)), {
      concurrency: 1,
    }).pipe(Effect.tapError(rollback));
    return yield* Effect.forEach(
      planned,
      ({ bytes: _bytes, ...row }) => insertMenuItemImageEffect(db, row),
      { concurrency: 1 },
    ).pipe(Effect.tapError(rollback));
  });

export const deleteMenuItemWithImagesSvc = (
  db: DbConnectType,
  storage: MenuImageStorage,
  tenantId: string,
  itemId: string,
): Effect.Effect<{ id: string }, DbError | NotFound | ExternalError> =>
  Effect.gen(function* () {
    const keys = yield* listMenuItemImageObjectKeysEffect(db, tenantId, itemId);
    const deleted = yield* deleteMenuItemEffect(db, tenantId, itemId);
    yield* dropStored(storage, keys);
    return deleted;
  });

export const deleteMenuCategoryWithImagesSvc = (
  db: DbConnectType,
  storage: MenuImageStorage,
  tenantId: string,
  categoryId: string,
): Effect.Effect<{ id: string }, DbError | NotFound | ExternalError> =>
  Effect.gen(function* () {
    const keys = yield* listMenuItemImageObjectKeysForCategoryEffect(db, tenantId, categoryId);
    const deleted = yield* deleteMenuCategoryEffect(db, tenantId, categoryId);
    yield* dropStored(storage, keys);
    return deleted;
  });

export const dropTenantMenuItemImagesSvc = (
  storage: Pick<MenuImageStorage, "delete">,
  keys: ReadonlyArray<string>,
): Effect.Effect<void, ExternalError> => dropStored(storage, keys);

export const setMenuItemImageCoverSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  imageId: string,
): Effect.Effect<MenuItemImageRecord[], DbError | NotFound> =>
  Effect.gen(function* () {
    yield* getOwnedMenuItemImageEffect(db, tenantId, itemId, imageId);
    return yield* setMenuItemImageCoverEffect(db, tenantId, itemId, imageId);
  });

export const reorderMenuItemImagesSvc = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  ids: ReadonlyArray<string>,
): Effect.Effect<MenuItemImageRecord[], DbError | NotFound | Invalid> =>
  Effect.gen(function* () {
    yield* requireMenuItemEffect(db, tenantId, itemId);
    const byItem = yield* listMenuItemImagesByItemEffect(db, tenantId, [itemId]);
    const own = (byItem.get(itemId) ?? []).map((image) => image.id);
    if (ids.length !== own.length || new Set(ids).size !== ids.length || !ids.every((id) => own.includes(id))) {
      return yield* new Invalid({ message: MENU_ORDER_MISMATCH });
    }
    return yield* setMenuItemImageOrderEffect(db, tenantId, itemId, ids);
  });

export const deleteMenuItemImageSvc = (
  db: DbConnectType,
  storage: MenuImageStorage,
  tenantId: string,
  itemId: string,
  imageId: string,
): Effect.Effect<{ id: string }, DbError | NotFound | ExternalError> =>
  Effect.gen(function* () {
    const row = yield* getOwnedMenuItemImageEffect(db, tenantId, itemId, imageId);
    yield* deleteMenuItemImageRowEffect(db, tenantId, row.id);
    yield* dropStored(storage, [row.objectKey]);
    return { id: row.id };
  });
