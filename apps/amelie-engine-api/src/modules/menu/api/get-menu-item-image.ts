import { Hono } from "hono";
import { MenuItemImageParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { createMenuImageStorage } from "#/modules/menu/lib";
import { getMenuItemImageBytesSvc } from "#/modules/menu/handlers";
import { getMenuItemImageDoc } from "#/modules/menu/openapi";

const app = new Hono<AppEnv>();

app.get("/:imageId", getMenuItemImageDoc, zValidator("param", MenuItemImageParamSchema), async (c) => {
  const { imageId } = c.req.valid("param");
  // -----
  // An owner may have just uploaded; a cached
  // read would 404 the new photo.
  // -----
  const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
  const data = await runEffect(getMenuItemImageBytesSvc(db, createMenuImageStorage(c.env), imageId));
  // -----
  // The resource is the image bytes, not JSON.
  // -----
  return new Response(data.bytes, {
    headers: {
      "Content-Type": data.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export default app;
