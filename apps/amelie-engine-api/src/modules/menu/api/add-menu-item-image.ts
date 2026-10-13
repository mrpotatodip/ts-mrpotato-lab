import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { IMPORT_MAX_FILE_BYTES, MENU_ITEM_IMAGE_MAX, MenuItemParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { PayloadTooLargeError, ValidationError } from "#/lib/errors";
import { requireTenantEditor } from "#/modules/tenant";
import { MENU_ITEM_IMAGE_NO_FILE } from "#/modules/menu/constants";
import { addMenuItemImagesSvc } from "#/modules/menu/handlers";
import { createMenuImageStorage } from "#/modules/menu/lib";
import { addMenuItemImageDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/items/:itemId/images",
  addMenuItemImageDoc,
  requireTenantEditor,
  zValidator("param", MenuItemParamSchema),
  bodyLimit({
    maxSize: IMPORT_MAX_FILE_BYTES * MENU_ITEM_IMAGE_MAX + 1024 * 1024,
    onError: () => {
      throw new PayloadTooLargeError();
    },
  }),
  async (c) => {
    const { itemId } = c.req.valid("param");
    const body = await c.req.parseBody({ all: true }).catch(() => ({}));
    const sent = "files" in body ? body.files : "file" in body ? body.file : [];
    const entries = Array.isArray(sent) ? sent : [sent];
    const files = await Promise.all(
      entries.filter((entry) => entry instanceof File).map(async (file) => ({
        name: file.name,
        contentType: file.type,
        bytes: await file.arrayBuffer(),
      })),
    );
    if (files.length === 0) throw new ValidationError(MENU_ITEM_IMAGE_NO_FILE);
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(addMenuItemImagesSvc(db, createMenuImageStorage(c.env), c.get("tenantId"), itemId, files));
    return c.json({ data, error: null }, 201);
  },
);

export default app;
