import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getBusinessProfileAPI, updateBusinessProfileAPI } from "./api";

// -----
// A Tenant's contact facts: any member reads,
// a tenant_admin or store_admin changes.
// -----
const app = new Hono<AppEnv>();

app.route("/", getBusinessProfileAPI);
app.route("/", updateBusinessProfileAPI);

export default app;
export * from "./handlers";
export * from "./types";
