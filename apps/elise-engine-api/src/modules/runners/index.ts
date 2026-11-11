import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { createRunnerAPI, disconnectRunnerAPI, enrollRunnerAPI, listRunnersAPI, removeRunnerAPI, runnerMeAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", createRunnerAPI);
app.route("/", listRunnersAPI);
app.route("/", enrollRunnerAPI);
app.route("/", runnerMeAPI);
app.route("/", disconnectRunnerAPI);
app.route("/", removeRunnerAPI);

export default app;
