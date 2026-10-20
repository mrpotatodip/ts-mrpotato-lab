import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getBusinessProfileAPI, updateBusinessProfileAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getBusinessProfileAPI);
app.route("/", updateBusinessProfileAPI);

export default app;
export * from "./handlers";
export * from "./types";
