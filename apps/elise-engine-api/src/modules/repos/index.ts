import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import { addBranchAPI, addRepoAPI, getRepoAPI, listRepoFindingsAPI, listReposAPI } from "./api";

const app = new Hono<AppEnv>();

app.route("/", listReposAPI);
app.route("/", addRepoAPI);
app.route("/", getRepoAPI);
app.route("/", listRepoFindingsAPI);
app.route("/", addBranchAPI);

export { scanDiffSvc } from "./handlers";
export { scanDiffDoc } from "./openapi";

export default app;
