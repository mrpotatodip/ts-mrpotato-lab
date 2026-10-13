import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { IMPORT_MAX_FILE_BYTES, IMPORT_MAX_IMAGES } from "@repo/contracts/amelie";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { PayloadTooLargeError, ValidationError } from "#/lib/errors";
import { requireTenantEditor } from "#/modules/tenant";
import { IMPORT_NO_FILES } from "#/modules/menu-import/constants";
import { createImportSvc } from "#/modules/menu-import/handlers";
import { createImportRuntime } from "#/modules/menu-import/lib";
import { createImportDoc } from "#/modules/menu-import/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/",
  createImportDoc,
  requireTenantEditor,
  bodyLimit({
    maxSize: IMPORT_MAX_FILE_BYTES * IMPORT_MAX_IMAGES + 1024 * 1024,
    onError: () => {
      throw new PayloadTooLargeError();
    },
  }),
  async (c) => {
    const body = await c.req.parseBody({ all: true }).catch(() => ({}));
    const sent = "files" in body ? body.files : [];
    const entries = Array.isArray(sent) ? sent : [sent];
    const files = await Promise.all(
      entries.filter((entry) => entry instanceof File).map(async (file) => ({
        name: file.name,
        contentType: file.type,
        bytes: await file.arrayBuffer(),
      })),
    );
    if (files.length === 0) throw new ValidationError(IMPORT_NO_FILES);
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(createImportSvc(createImportRuntime(c.env, db), c.get("tenantId"), files));
    return c.json({ data, error: null });
  },
);

export default app;
