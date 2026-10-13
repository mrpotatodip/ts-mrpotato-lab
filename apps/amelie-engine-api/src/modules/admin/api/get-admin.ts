import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getAdminDoc } from "#/modules/admin/openapi";

const app = new Hono<AppEnv>();

app.get("/", getAdminDoc, (c) => c.json({ data: { isSuperuser: true }, error: null }));

export default app;
