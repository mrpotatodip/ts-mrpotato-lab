import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { IMPORT_MAX_FILE_BYTES, MENU_ITEM_IMAGE_MAX, MenuItemParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { PayloadTooLargeError } from "#/lib/errors";
import { requireTenantEditor } from "#/modules/tenant";
import { addMenuItemImagesSvc } from "#/modules/menu/handlers";
import { createMenuImageStorage, toMenuItemImageFiles } from "#/modules/menu/lib";
import { addMenuItemImagesDoc } from "#/modules/menu/openapi";
import { MenuItemImagesFormSchema } from "#/modules/menu/schemas";

const app = new Hono<AppEnv>();

app.post(
  "/items/:itemId/images",
  addMenuItemImagesDoc,
  requireTenantEditor,
  zValidator("param", MenuItemParamSchema),
  bodyLimit({
    maxSize: IMPORT_MAX_FILE_BYTES * MENU_ITEM_IMAGE_MAX + 1024 * 1024,
    onError: () => {
      throw new PayloadTooLargeError();
    },
  }),
  zValidator("form", MenuItemImagesFormSchema),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(
      addMenuItemImagesSvc(
        db,
        createMenuImageStorage(c.env),
        c.get("tenantId"),
        itemId,
        await toMenuItemImageFiles(c.req.valid("form")),
      ),
    );
    return c.json({ data, error: null }, 201);
  },
);

export default app;
