import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { getVerdictAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", getVerdictAPI);

export default app;
