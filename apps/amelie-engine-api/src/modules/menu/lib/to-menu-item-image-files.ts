import type { MenuItemImageFile } from "#/modules/menu/types";

export const toMenuItemImageFiles = (files: ReadonlyArray<File>): Promise<MenuItemImageFile[]> =>
  Promise.all(
    files.map(async (file) => ({
      name: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
    })),
  );
