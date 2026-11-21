import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { approveRunnerLoginAPI, checkRunnerLoginAPI, claimJobAPI, createRunnerAPI, denyRunnerLoginAPI, disconnectRunnerAPI, enrollRunnerAPI, jobArchiveAPI, jobStateAPI, listRunnersAPI, lookupRunnerLoginAPI, removeRunnerAPI, reportJobAPI, runnerMeAPI, saveLiveFindingsAPI, saveTraceAPI, startRunnerLoginAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", createRunnerAPI);
app.route("/", listRunnersAPI);
app.route("/", enrollRunnerAPI);
app.route("/", startRunnerLoginAPI);
app.route("/", lookupRunnerLoginAPI);
app.route("/", approveRunnerLoginAPI);
app.route("/", denyRunnerLoginAPI);
app.route("/", checkRunnerLoginAPI);
app.route("/", claimJobAPI);
app.route("/", reportJobAPI);
app.route("/", saveTraceAPI);
app.route("/", saveLiveFindingsAPI);
app.route("/", jobArchiveAPI);
app.route("/", jobStateAPI);
app.route("/", runnerMeAPI);
app.route("/", disconnectRunnerAPI);
app.route("/", removeRunnerAPI);

export default app;
