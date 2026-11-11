import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { createRunnerAPI, disconnectRunnerAPI, enrollRunnerAPI, runnerMeAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", createRunnerAPI);
app.route("/", enrollRunnerAPI);
app.route("/", runnerMeAPI);
app.route("/", disconnectRunnerAPI);

export default app;
