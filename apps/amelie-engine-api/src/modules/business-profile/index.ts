import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getBusinessProfileAPI, updateBusinessProfileAPI } from "./api";

// -----
// A Tenant's contact facts: any member reads,
// an owner or manager changes.
// -----
const app = new Hono<AppEnv>();

app.route("/", getBusinessProfileAPI);
app.route("/", updateBusinessProfileAPI);

export default app;
export * from "./handlers";
export * from "./types";
