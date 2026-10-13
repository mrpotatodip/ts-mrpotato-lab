import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { createInviteCodeAPI, listInviteCodesAPI, revokeInviteCodeAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", createInviteCodeAPI);
app.route("/", listInviteCodesAPI);
app.route("/", revokeInviteCodeAPI);

export default app;
export * from "./lib";
