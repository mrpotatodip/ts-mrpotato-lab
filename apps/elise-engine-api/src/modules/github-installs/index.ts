import { Hono } from "hono";
import type { AppEnv } from "#/types/variables";
import {
  connectGithubAPI,
  createGithubInstallationAPI,
  disconnectGithubInstallationAPI,
  listGithubBranchesAPI,
  listGithubInstallationsAPI,
  listGithubReposAPI,
} from "./api";

const app = new Hono<AppEnv>();

app.route("/", connectGithubAPI);
app.route("/", createGithubInstallationAPI);
app.route("/", disconnectGithubInstallationAPI);
app.route("/", listGithubBranchesAPI);
app.route("/", listGithubInstallationsAPI);
app.route("/", listGithubReposAPI);

export { githubAccessFor, githubPortFor } from "./lib";
export { neonInstallationRepo } from "./queries";
export type { GithubAccess, GithubAccessEnv, GithubConnectEnv, GithubPort, InstallationRecord, InstallationRepo } from "./types";

export default app;
