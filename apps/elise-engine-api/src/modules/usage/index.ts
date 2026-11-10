import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getUsageAPI, updateUsageBudgetAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getUsageAPI);
app.route("/", updateUsageBudgetAPI);

export default app;
export * from "./utils";
export * from "./types";
export { monthSpendEffect } from "./queries";
