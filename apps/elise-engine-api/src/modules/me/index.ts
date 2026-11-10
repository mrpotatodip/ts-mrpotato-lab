import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getMeAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getMeAPI);

export default app;
export { userHasAccountEffect, userHasPowerEffect } from "./queries";
