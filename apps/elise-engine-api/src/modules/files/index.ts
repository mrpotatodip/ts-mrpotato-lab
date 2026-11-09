import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { filesAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", filesAPI);

export default app;
