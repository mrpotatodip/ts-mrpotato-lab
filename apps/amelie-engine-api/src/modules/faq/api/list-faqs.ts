import { Hono } from "hono";
import { LocationQuerySchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import type { FaqScope } from "#/modules/faq/types";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { listFaqsSvc } from "#/modules/faq/handlers";
import { listFaqsDoc } from "#/modules/faq/openapi";

const app = new Hono<AppEnv>();

app.get(
  "/",
  listFaqsDoc,
  zValidator("query", LocationQuerySchema),
  async (c) => {
    const { locationId } = c.req.valid("query");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const scope: FaqScope = locationId === undefined ? { kind: "all" } : { kind: "location", locationId };
    const data = await runEffect(listFaqsSvc(db, c.get("tenantId"), scope));
    return c.json({ data, error: null });
  },
);

export default app;
