import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getAdminAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getAdminAPI);

export default app;
export * from "./lib";
