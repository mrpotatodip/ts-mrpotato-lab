import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getTenantHoursAPI, removeHoursOverrideAPI, setHoursOverrideAPI, setWeeklyHoursAPI } from "./api";

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
