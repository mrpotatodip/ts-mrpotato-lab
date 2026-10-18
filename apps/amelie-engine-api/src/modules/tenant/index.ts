import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  listTenantsAPI,
  getTenantAPI,
  updateTenantRegionAPI,
  updateTenantAllowedOriginsAPI,
  updateTenantCustomerChatAPI,
} from "./api";

const app = new Hono<AppEnv>();

app.route("/", listTenantsAPI);
app.route("/", getTenantAPI);
app.route("/", updateTenantRegionAPI);
app.route("/", updateTenantAllowedOriginsAPI);
app.route("/", updateTenantCustomerChatAPI);

export default app;
export * from "./handlers";
export * from "./lib";
export * from "./types";
export * from "./constants";
