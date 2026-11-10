import { createServerFn } from "@tanstack/react-start";
import { engineJson, jsonPost } from "#/lib/engine-client";
import { engineAuth } from "#/modules/auth/server/session";
import {
  ConnectGithubBodySchema,
  GithubBranchesQuerySchema,
  GithubBranchesSchema,
  GithubConnectSchema,
  GithubInstallationParamSchema,
  GithubInstallationSchema,
  GithubInstallationsSchema,
  GithubReposSchema,
} from "../schemas";

// -----
// Reading is open to any member of the account. Connecting needs a
// signed-in tenant_admin; the engine checks it.
// -----
export const fetchGithubInstallations = createServerFn({ method: "GET" }).handler(async () =>
  engineJson(GithubInstallationsSchema, "/github/installations", {}, await engineAuth()),
);

export const fetchGithubRepos = createServerFn({ method: "GET" }).handler(async () => engineJson(GithubReposSchema, "/github/repos", {}, await engineAuth()));

export const fetchGithubBranches = createServerFn({ method: "GET" })
  .validator(GithubBranchesQuerySchema)
  .handler(async ({ data }) => {
    const params = new URLSearchParams({ installationId: data.installationId, repo: data.repo });
    return engineJson(GithubBranchesSchema, `/github/branches?${params}`, {}, await engineAuth());
  });

export const startGithubConnect =createServerFn({ method: "POST" }).handler(async () =>
  engineJson(GithubConnectSchema, "/github/connect", { method: "POST" }, await engineAuth()),
);

export const disconnectGithub = createServerFn({ method: "POST" })
  .validator(GithubInstallationParamSchema)
  .handler(async ({ data }) => engineJson(GithubInstallationSchema, `/github/installations/${data.id}`, { method: "DELETE" }, await engineAuth()));

export const finishGithubConnect = createServerFn({ method: "POST" })
  .validator(ConnectGithubBodySchema)
  .handler(async ({ data }) => engineJson(GithubInstallationSchema, "/github/installations", jsonPost(JSON.stringify(data)), await engineAuth()));
