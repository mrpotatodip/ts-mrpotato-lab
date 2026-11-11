import { Effect } from "effect";
import type { ConnectGithubBody, GithubBranches, GithubBranchesQuery, GithubConnect, GithubInstallation, GithubRepo } from "@repo/contracts/elise";
import type { DbConnectType, PoolDbType } from "#/lib/db-connection";
import { Forbidden, Invalid, NotFound, toExternalError, type Conflict, type DbError, type ExternalError } from "#/lib/effect-query";
import {
  GITHUB_CHECK_STALE_MS,
  GITHUB_CODE_REFUSED,
  GITHUB_INSTALL_NOT_FOUND,
  GITHUB_INSTALL_NOT_YOURS,
  GITHUB_INSTALL_STATE_TTL_MS,
  GITHUB_INSTALL_UNKNOWN,
  GITHUB_NOT_SET_UP,
  GITHUB_REPO_NOT_VISIBLE,
  GITHUB_REPOS_CONCURRENCY,
  GITHUB_STATE_REFUSED,
} from "#/modules/github-installs/constants";
import { connectInstallationEffect, disconnectInstallationEffect, listInstallationsEffect, saveInstallationCheckEffect } from "#/modules/github-installs/queries";
import type { GithubPort } from "#/modules/github-installs/types";
import { readInstallState, signInstallState } from "#/modules/github-installs/utils";

// -----
// Step one: the address to send the admin to. It carries a state that
// names the account and the admin, signed, good for ten minutes.
// -----
export const githubConnectUrlSvc = (
  port: GithubPort | null,
  authSecret: string,
  accountId: string,
  userId: string,
  nowMs: number,
): Effect.Effect<GithubConnect, Invalid | ExternalError> =>
  Effect.gen(function* () {
    if (port === null) return yield* new Invalid({ message: GITHUB_NOT_SET_UP });
    const slug = yield* Effect.tryPromise({ try: () => port.appSlug(), catch: toExternalError });
    const state = yield* Effect.promise(() => signInstallState(authSecret, { accountId, userId, nonce: crypto.randomUUID(), expiresAt: nowMs + GITHUB_INSTALL_STATE_TTL_MS }));
    return { url: `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}` };
  });

// -----
// Step two, when GitHub sends the browser back. Four things must hold
// before an install is saved: the state is ours, unexpired and made
// for this admin and account; GitHub accepts the one-time code; the
// person behind that code can use this install (the number in the
// address proves nothing); and the install exists.
// -----
export const connectGithubSvc = (
  db: PoolDbType,
  port: GithubPort | null,
  authSecret: string,
  accountId: string,
  userId: string,
  body: ConnectGithubBody,
  now: Date,
): Effect.Effect<GithubInstallation, Invalid | Forbidden | NotFound | Conflict | ExternalError | DbError> =>
  Effect.gen(function* () {
    if (port === null) return yield* new Invalid({ message: GITHUB_NOT_SET_UP });
    const state = yield* Effect.promise(() => readInstallState(authSecret, body.state, now.getTime()));
    if (state === null || state.accountId !== accountId || state.userId !== userId) return yield* new Forbidden({ message: GITHUB_STATE_REFUSED });

    const userToken = yield* Effect.tryPromise({ try: () => port.exchangeCode(body.code), catch: () => new Forbidden({ message: GITHUB_CODE_REFUSED }) });
    const usable = yield* Effect.tryPromise({ try: () => port.userInstallationIds(userToken), catch: toExternalError });
    if (!usable.includes(body.installationId)) return yield* new Forbidden({ message: GITHUB_INSTALL_NOT_YOURS });

    const info = yield* Effect.tryPromise({ try: () => port.installation(body.installationId), catch: toExternalError });
    if (info === null) return yield* new NotFound({ message: GITHUB_INSTALL_UNKNOWN });
    return yield* connectInstallationEffect(db, { tenantId: accountId, userId, installationId: body.installationId, info, now });
  });

// -----
// The Account's installs. Any that GitHub was last asked about more than
// five minutes ago are asked again first, so a removed or suspended
// install shows as such without a webhook. If GitHub cannot answer, the
// status stays as it was. An install the admin disconnected is not asked.
// -----
export const listGithubInstallationsSvc = (db: DbConnectType, port: GithubPort | null, accountId: string, now: Date): Effect.Effect<GithubInstallation[], DbError> =>
  Effect.gen(function* () {
    const installs = yield* listInstallationsEffect(db, accountId);
    if (port === null) return installs;
    const stale = installs.filter((install) => install.status !== "removed" && (install.checkedAt === null || now.getTime() - Date.parse(install.checkedAt) >= GITHUB_CHECK_STALE_MS));
    if (stale.length === 0) return installs;
    yield* Effect.forEach(
      stale,
      (install) =>
        Effect.tryPromise({ try: () => port.installation(install.installationId), catch: toExternalError }).pipe(
          Effect.flatMap((info) => saveInstallationCheckEffect(db, accountId, install.id, info, now)),
          Effect.catchTag("ExternalError", (error) =>
            Effect.sync(() => console.error("github: could not check an install", error.cause instanceof Error ? error.cause.message : "unknown")),
          ),
        ),
      { concurrency: GITHUB_REPOS_CONCURRENCY, discard: true },
    );
    return yield* listInstallationsEffect(db, accountId);
  });

// -----
// The branches of one repo, for the scan form. The install is looked up
// among the Account's own active installs, so another Account's install
// id finds nothing. A repo the install cannot see answers 404.
// -----
export const listGithubBranchesSvc = (
  db: DbConnectType,
  port: GithubPort | null,
  accountId: string,
  query: GithubBranchesQuery,
): Effect.Effect<GithubBranches, Invalid | NotFound | DbError | ExternalError> =>
  Effect.gen(function* () {
    if (port === null) return yield* new Invalid({ message: GITHUB_NOT_SET_UP });
    const installs = yield* listInstallationsEffect(db, accountId, true);
    const install = installs.find((candidate) => candidate.id === query.installationId);
    if (install === undefined) return yield* new NotFound({ message: GITHUB_INSTALL_NOT_FOUND });

    const [owner = "", name = ""] = query.repo.split("/");
    const found = yield* Effect.tryPromise({ try: () => port.repoBranches(install.installationId, owner, name), catch: toExternalError });
    if (found === null) return yield* new NotFound({ message: GITHUB_REPO_NOT_VISIBLE });
    return found;
  });

export const disconnectGithubSvc =(db: PoolDbType, accountId: string, userId: string, id: string): Effect.Effect<GithubInstallation, NotFound | Forbidden | DbError> =>
  disconnectInstallationEffect(db, accountId, userId, id);

// -----
// The repos the Account's active installs can see, for the picker. An
// install GitHub will not answer for is left out, and the rest still
// show: one broken install must not hide the others.
// -----
export const listGithubReposSvc = (db: DbConnectType, port: GithubPort | null, accountId: string): Effect.Effect<GithubRepo[], DbError> =>
  Effect.gen(function* () {
    if (port === null) return [];
    const installs = yield* listInstallationsEffect(db, accountId, true);
    const lists = yield* Effect.forEach(
      installs,
      (install) =>
        Effect.tryPromise({ try: () => port.installationRepos(install.installationId), catch: toExternalError }).pipe(
          Effect.map((repos): GithubRepo[] => repos.map((repo) => ({ installationId: install.id, fullName: repo.fullName, url: repo.url, private: repo.isPrivate }))),
          Effect.catchTag("ExternalError", (error) =>
            Effect.sync((): GithubRepo[] => {
              console.error("github: could not list the repos of an install", error.cause instanceof Error ? error.cause.message : "unknown");
              return [];
            }),
          ),
        ),
      { concurrency: GITHUB_REPOS_CONCURRENCY },
    );
    return lists.flat().toSorted((a, b) => a.fullName.localeCompare(b.fullName));
  });
