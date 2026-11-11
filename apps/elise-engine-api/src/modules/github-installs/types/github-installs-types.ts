import type { Effect } from "effect";
import type { DbError, ExternalError } from "#/lib/effect-query";
import type { GithubInstallationInfo, GithubListedRepo, GithubRepoBranches } from "#/modules/github-app";
import type { ScanGithub } from "#/schemas";
import type { Bindings } from "#/types/variables";

export type InstallationRecord = { id: string; installationId: number };

// -----
// The installs an Account connected. Only an active install of
// that Account is ever found, so another Account's install cannot
// sign a scan.
// -----
export type InstallationRepo = {
  findActive: (accountId: string, installationId: number) => Effect.Effect<InstallationRecord | null, DbError>;
};

export type GithubAccessEnv = Pick<Bindings, "GITHUB_APP_ID" | "GITHUB_APP_PRIVATE_KEY">;

// -----
// Connecting needs the App's OAuth pair as well, to learn which person
// finished the install, and AUTH_SECRET to sign the state.
// -----
export type GithubConnectEnv = GithubAccessEnv & Pick<Bindings, "GITHUB_APP_CLIENT_ID" | "GITHUB_APP_CLIENT_SECRET" | "AUTH_SECRET">;

// -----
// The questions the install flow asks GitHub. A route builds the real
// one from the environment; a test passes answers it chose.
// -----
export type GithubPort = {
  appSlug: () => Promise<string>;
  exchangeCode: (code: string) => Promise<string>;
  userInstallationIds: (userToken: string) => Promise<number[]>;
  installation: (installationId: number) => Promise<GithubInstallationInfo | null>;
  installationRepos: (installationId: number) => Promise<GithubListedRepo[]>;
  repoBranches: (installationId: number, owner: string, name: string) => Promise<GithubRepoBranches | null>;
};

export type NewInstallation = {
  tenantId: string;
  userId: string;
  installationId: number;
  info: GithubInstallationInfo;
  now: Date;
};

// -----
// For one Account: does an install of its own cover this repo?
// Null means clone anonymously, as for any public repo.
// -----
export type GithubAccess = {
  forRepo: (repoUrl: string) => Effect.Effect<ScanGithub | null, DbError | ExternalError>;
};
