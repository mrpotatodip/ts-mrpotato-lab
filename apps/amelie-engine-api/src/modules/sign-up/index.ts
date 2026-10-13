import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { createAccountAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", createAccountAPI);

export default app;
export * from "./handlers";
export * from "./lib";
export * from "./types";
