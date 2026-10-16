import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getTenantHoursAPI, removeHoursOverrideAPI, setHoursOverrideAPI, setWeeklyHoursAPI } from "./api";

// -----
// Business hours and Hours overrides: any member
// reads, a tenant_admin or store_admin changes.
// -----
const app = new Hono<AppEnv>();

app.route("/", getTenantHoursAPI);
app.route("/", setWeeklyHoursAPI);
app.route("/", setHoursOverrideAPI);
app.route("/", removeHoursOverrideAPI);

export default app;
export * from "./constants";
export * from "./handlers";
export * from "./lib";
export * from "./types";
