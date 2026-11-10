import { Effect } from "effect";
import { toExternalError } from "#/lib/effect-query";
import { findRepoInstallation, getRepoInfo, type GithubFetch } from "#/modules/github-app";
import type { GithubAccess, GithubAccessEnv, InstallationRepo } from "#/modules/github-installs/types";
import { canonicalRepo } from "#/modules/scan-ledger/utils";

// -----
// Decides whether a scan clones with a token. Three things must
// hold: the App is set up, GitHub says an install covers the repo,
// and that install is one this Account connected. If GitHub cannot
// answer the first question, the scan goes on anonymously: a public
// repo must not wait on the GitHub API. A private repo then fails
// at the clone.
// -----
export const githubAccessFor = (env: GithubAccessEnv, installs: InstallationRepo, accountId: string, fetchImpl?: GithubFetch): GithubAccess => ({
  forRepo: (repoUrl) =>
    Effect.gen(function* () {
      const { GITHUB_APP_ID: appId, GITHUB_APP_PRIVATE_KEY: privateKey } = env;
      if (appId === undefined || privateKey === undefined) return null;
      const config = { appId, privateKey };
      const repo = canonicalRepo(repoUrl);
      const [owner = "", name = ""] = repo.split("/");

      const covering = yield* Effect.tryPromise({ try: () => findRepoInstallation(config, owner, name, fetchImpl), catch: toExternalError }).pipe(
        Effect.catchTag("ExternalError", (error) =>
          Effect.sync(() => {
            console.error("github: could not look up the install", error.cause instanceof Error ? error.cause.message : "unknown");
            return null;
          }),
        ),
      );
      if (covering === null) return null;

      const install = yield* installs.findActive(accountId, covering);
      if (install === null) return null;

      const info = yield* Effect.tryPromise({ try: () => getRepoInfo(config, covering, owner, name, fetchImpl), catch: toExternalError });
      if (info === null) return null;
      return { installationRowId: install.id, installationId: install.installationId, repoId: info.repoId, repo, isPrivate: info.isPrivate };
    }),
});
