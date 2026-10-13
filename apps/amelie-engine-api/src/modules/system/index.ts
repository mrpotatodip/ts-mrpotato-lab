import { Hono } from "hono";
import { healthDoc } from "./openapi";
import type { AppEnv } from "#/types/variables";
import { version } from "../../../package.json";

const app = new Hono<AppEnv>();

app.get("/health", healthDoc, async (c) => {
  return c.json({ data: { ok: true, version }, error: null });
});

export default app;
