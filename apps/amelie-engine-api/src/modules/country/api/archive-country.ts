import { Hono } from "hono";
import { CountryParamSchema } from "@repo/contracts/amelie";
import { zValidator } from "#/lib/zod-validator";
import type { AppEnv } from "#/types/variables";
import { db_connect } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { requirePower } from "#/modules/tenant";
import { archiveCountrySvc } from "#/modules/country/handlers";
import { archiveCountryDoc } from "#/modules/country/openapi";

const app = new Hono<AppEnv>();

app.post(
  "/:countryId/archive",
  archiveCountryDoc,
  requirePower("company:profile:countries:archive"),
  zValidator("param", CountryParamSchema),
  async (c) => {
    const { countryId } = c.req.valid("param");
    const db = db_connect(c.env.HYPERDRIVE_REALTIME.connectionString);
    const data = await runEffect(archiveCountrySvc(db, c.get("tenantId"), countryId));
    return c.json({ data, error: null });
  },
);

export default app;
