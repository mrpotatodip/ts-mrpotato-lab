import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getUsageAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getUsageAPI);

export default app;
export * from "./utils";
export * from "./types";
export { monthSpendEffect } from "./queries";
