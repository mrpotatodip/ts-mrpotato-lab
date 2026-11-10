import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getBudgetChangesAPI, getSettingsChangesAPI, getUsageAPI, updateUsageBudgetAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getUsageAPI);
app.route("/", updateUsageBudgetAPI);
app.route("/", getBudgetChangesAPI);
app.route("/", getSettingsChangesAPI);

export default app;
export * from "./utils";
export * from "./types";
export { monthSpendEffect } from "./queries";
