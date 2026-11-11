import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { anthropicKeyAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", anthropicKeyAPI);

export default app;
export { findSealedKeyEffect } from "./queries";
export { openKey } from "./utils";
export { ANTHROPIC_KEY_UNREADABLE } from "./constants";
