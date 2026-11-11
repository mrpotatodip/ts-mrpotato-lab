import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { findingsAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", findingsAPI);

export default app;
