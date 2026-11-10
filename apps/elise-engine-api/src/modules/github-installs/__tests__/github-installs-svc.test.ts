import { asc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { accessAuditLog, authUser, tenantGithubInstallations } from "@repo/db-elise/schema";
import type { ConnectGithubBody } from "@repo/contracts/elise";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import type { GithubInstallationInfo } from "#/modules/github-app";
import { connectGithubSvc, disconnectGithubSvc, githubConnectUrlSvc, listGithubBranchesSvc, listGithubInstallationsSvc, listGithubReposSvc } from "#/modules/github-installs/handlers";
import { neonInstallationRepo, type GithubPort } from "#/modules/github-installs";
import { signInstallState } from "#/modules/github-installs/utils";

const SECRET = "test-secret-test-secret-test-secret";
const NOW = new Date("2026-11-10T09:00:00.000Z");

let test: TestDb;
let acme: { tenantId: string; partyId: string };
let other: { tenantId: string; partyId: string };

beforeAll(async () => {
  test = await openTestDb();
  acme = await seedTenant(test, "acme");
  other = await seedTenant(test, "other");
  await test.raw.insert(authUser).values({ id: "ada", name: "Ada Rossi", email: "ada@example.com", partyId: acme.partyId });
  await test.raw.insert(authUser).values({ id: "bob", name: "Bob Rossi", email: "bob@example.com", partyId: other.partyId });
});

beforeEach(async () => {
  await test.raw.delete(tenantGithubInstallations);
});

afterAll(async () => {
  await test.close();
});

const infoOf = (overrides: Partial<GithubInstallationInfo> = {}): GithubInstallationInfo => ({
  accountLogin: "octo",
  repositorySelection: "selected",
  htmlUrl: "https://github.com/settings/installations/42",
  suspended: false,
  ...overrides,
});

const asks = () => {
  const asked: number[] = [];
  return { asked, record: (id: number) => void asked.push(id) };
};

const fakePort = (overrides: Partial<GithubPort> = {}) => {
  const calls: string[] = [];
  const port: GithubPort = {
    appSlug: async () => "elise",
    exchangeCode: async (code) => {
      calls.push(`exchange:${code}`);
      return "user-token";
    },
    userInstallationIds: async () => [42],
    installation: async () => infoOf(),
    installationRepos: async () => [],
    repoBranches: async () => ({ defaultBranch: "main", branches: ["main", "develop"], truncated: false }),
    ...overrides,
  };
  return { port, calls };
};

const stateFor = (accountId: string, userId: string, expiresAt = NOW.getTime() + 60_000) => signInstallState(SECRET, { accountId, userId, nonce: crypto.randomUUID(), expiresAt });

const bodyWith = async (state?: string): Promise<ConnectGithubBody> => ({
  installationId: 42,
  code: "one-time",
  state: state ?? (await stateFor(acme.tenantId, "ada")),
  noticeAccepted: true,
});

const connect = (port: GithubPort | null, body: ConnectGithubBody, accountId = acme.tenantId, userId = "ada") =>
  connectGithubSvc(test.pool, port, SECRET, accountId, userId, body, NOW);

const rows = () => test.raw.select().from(tenantGithubInstallations);

// -----
// The audit trail is append-only, so it is never cleared between
// tests. A test reads the rows of its own subject, or compares counts.
// -----
const auditCount = async () => (await test.raw.select().from(accessAuditLog)).length;

const repo = (name: string) => ({ fullName: `octo/${name}`, url: `https://github.com/octo/${name}`, isPrivate: name !== "open" });

describe("githubConnectUrlSvc", () => {
  it("sends the admin to the App's install page with a state in it", async () => {
    const { port } = fakePort();

    const { url } = await Effect.runPromise(githubConnectUrlSvc(port, SECRET, acme.tenantId, "ada", NOW.getTime()));

    expect(url).toMatch(/^https:\/\/github\.com\/apps\/elise\/installations\/new\?state=[\w%.-]+$/);
  });

  it("fails with Invalid when GitHub is not set up", async () => {
    const error = await Effect.runPromise(Effect.flip(githubConnectUrlSvc(null, SECRET, acme.tenantId, "ada", NOW.getTime())));

    expect(error._tag).toBe("Invalid");
  });

  it("fails with ExternalError when GitHub will not name the App", async () => {
    const { port } = fakePort({
      appSlug: async () => {
        throw new Error("down");
      },
    });

    const error = await Effect.runPromise(Effect.flip(githubConnectUrlSvc(port, SECRET, acme.tenantId, "ada", NOW.getTime())));

    expect(error._tag).toBe("ExternalError");
  });
});

describe("connectGithubSvc", () => {
  it("saves the install for the account and writes who did it, and when the notice was accepted, to the audit trail", async () => {
    const { port } = fakePort();

    const saved = await Effect.runPromise(connect(port, await bodyWith()));

    expect(saved).toMatchObject({ installationId: 42, accountLogin: "octo", repositorySelection: "selected", status: "active", checkedAt: NOW.toISOString() });
    expect(await rows()).toMatchObject([{ tenantId: acme.tenantId, connectedBy: acme.partyId, noticeAcceptedAt: NOW }]);
    const [entry] = await test.raw.select().from(accessAuditLog).where(eq(accessAuditLog.subjectId, saved.id));
    expect(entry).toMatchObject({ actorPartyId: acme.partyId, subjectId: saved.id });
    expect(entry?.after).toEqual({ tenantId: acme.tenantId, installationId: 42, accountLogin: "octo", repositorySelection: "selected", noticeAcceptedAt: NOW.toISOString(), reconnected: false });
  });

  it("records a suspended install as suspended", async () => {
    const { port } = fakePort({ installation: async () => infoOf({ repositorySelection: "all", suspended: true }) });

    const saved = await Effect.runPromise(connect(port, await bodyWith()));

    expect(saved).toMatchObject({ status: "suspended", repositorySelection: "all" });
  });

  it("fails with Invalid when GitHub is not set up", async () => {
    const error = await Effect.runPromise(Effect.flip(connect(null, await bodyWith())));

    expect(error._tag).toBe("Invalid");
  });

  describe("the state", () => {
    it.each([
      ["made for another account", () => stateFor(other.tenantId, "ada")],
      ["made for another admin", () => stateFor(acme.tenantId, "bob")],
      ["expired", () => stateFor(acme.tenantId, "ada", NOW.getTime() - 1)],
      ["not ours", async () => "garbage"],
    ])("is refused when it is %s, before GitHub is asked anything", async (_name, make) => {
      const { port, calls } = fakePort();

      const error = await Effect.runPromise(Effect.flip(connect(port, await bodyWith(await make()))));

      expect(error._tag).toBe("Forbidden");
      expect(calls).toEqual([]);
      expect(await rows()).toEqual([]);
    });
  });

  it("refuses an install the person behind the code cannot use, so a changed number in the address saves nothing", async () => {
    const { port } = fakePort({ userInstallationIds: async () => [7, 8] });
    const before = await auditCount();

    const error = await Effect.runPromise(Effect.flip(connect(port, await bodyWith())));

    expect(error).toMatchObject({ _tag: "Forbidden", message: "You cannot use that GitHub install" });
    expect(await rows()).toEqual([]);
    expect(await auditCount()).toBe(before);
  });

  it("refuses a code GitHub does not accept", async () => {
    const { port } = fakePort({
      exchangeCode: async () => {
        throw new Error("bad_verification_code");
      },
    });

    const error = await Effect.runPromise(Effect.flip(connect(port, await bodyWith())));

    expect(error._tag).toBe("Forbidden");
    expect(await rows()).toEqual([]);
  });

  it("fails with NotFound when GitHub has no such install", async () => {
    const { port } = fakePort({ installation: async () => null });

    const error = await Effect.runPromise(Effect.flip(connect(port, await bodyWith())));

    expect(error._tag).toBe("NotFound");
  });

  it("fails with ExternalError when GitHub cannot say which installs the person can use", async () => {
    const { port } = fakePort({
      userInstallationIds: async () => {
        throw new Error("down");
      },
    });

    const error = await Effect.runPromise(Effect.flip(connect(port, await bodyWith())));

    expect(error._tag).toBe("ExternalError");
  });

  it("refuses an install that another account already holds, and leaves that account's row as it was", async () => {
    const { port } = fakePort({ userInstallationIds: async () => [42] });
    await Effect.runPromise(connect(port, { ...(await bodyWith(await stateFor(other.tenantId, "bob"))) }, other.tenantId, "bob"));

    const error = await Effect.runPromise(Effect.flip(connect(port, await bodyWith())));

    expect(error).toMatchObject({ _tag: "Conflict", message: "This GitHub install is already connected to another account" });
    expect(await rows()).toMatchObject([{ tenantId: other.tenantId, installationId: 42 }]);
  });

  it("lets the same account connect it again: one row, refreshed, and the audit row says so", async () => {
    await Effect.runPromise(connect(fakePort({ installation: async () => infoOf({ suspended: true }) }).port, await bodyWith()));

    const again = await Effect.runPromise(connect(fakePort().port, await bodyWith()));

    expect(again).toMatchObject({ status: "active" });
    expect(await rows()).toHaveLength(1);
    const entries = await test.raw.select().from(accessAuditLog).where(eq(accessAuditLog.subjectId, again.id)).orderBy(asc(accessAuditLog.createdAt));
    expect(entries.map((entry) => entry.after)).toMatchObject([{ reconnected: false }, { reconnected: true }]);
  });

  it("refuses a login that has no Party, so the audit row always names someone", async () => {
    const error = await Effect.runPromise(Effect.flip(connect(fakePort().port, await bodyWith(await stateFor(acme.tenantId, "ghost")), acme.tenantId, "ghost")));

    expect(error._tag).toBe("Forbidden");
    expect(await rows()).toEqual([]);
  });
});

describe("listGithubInstallationsSvc", () => {
  const SOON = new Date(NOW.getTime() + 60 * 1000);
  const LATER = new Date(NOW.getTime() + 6 * 60 * 1000);

  it("lists only the installs of the account, with the place GitHub manages each", async () => {
    await Effect.runPromise(connect(fakePort().port, await bodyWith()));
    await Effect.runPromise(connect(fakePort({ userInstallationIds: async () => [99] }).port, { ...(await bodyWith(await stateFor(other.tenantId, "bob"))), installationId: 99 }, other.tenantId, "bob"));

    const mine = await Effect.runPromise(listGithubInstallationsSvc(test.http, null, acme.tenantId, NOW));

    expect(mine.map((install) => install.installationId)).toEqual([42]);
    expect(mine[0]?.manageUrl).toBe("https://github.com/settings/installations/42");
  });

  it("does not ask GitHub while the last check is fresh", async () => {
    await Effect.runPromise(connect(fakePort().port, await bodyWith()));
    const { asked, record } = asks();
    const { port } = fakePort({ installation: async (id) => (record(id), infoOf()) });

    await Effect.runPromise(listGithubInstallationsSvc(test.http, port, acme.tenantId, SOON));

    expect(asked).toEqual([]);
  });

  it("asks again once the check is old, and records what GitHub says", async () => {
    await Effect.runPromise(connect(fakePort().port, await bodyWith()));
    const { port } = fakePort({ installation: async () => infoOf({ suspended: true, repositorySelection: "all", accountLogin: "renamed" }) });

    const [install] = await Effect.runPromise(listGithubInstallationsSvc(test.http, port, acme.tenantId, LATER));

    expect(install).toMatchObject({ status: "suspended", repositorySelection: "all", accountLogin: "renamed", checkedAt: LATER.toISOString() });
  });

  it("marks an install GitHub no longer has as removed", async () => {
    await Effect.runPromise(connect(fakePort().port, await bodyWith()));
    const { port } = fakePort({ installation: async () => null });

    const [install] = await Effect.runPromise(listGithubInstallationsSvc(test.http, port, acme.tenantId, LATER));

    expect(install).toMatchObject({ status: "removed", checkedAt: LATER.toISOString() });
  });

  it("keeps the status as it was when GitHub cannot answer", async () => {
    await Effect.runPromise(connect(fakePort().port, await bodyWith()));
    const { port } = fakePort({
      installation: async () => {
        throw new Error("down");
      },
    });

    const [install] = await Effect.runPromise(listGithubInstallationsSvc(test.http, port, acme.tenantId, LATER));

    expect(install).toMatchObject({ status: "active", checkedAt: NOW.toISOString() });
  });

  it("does not ask about an install the admin disconnected, and does not revive it", async () => {
    const saved = await Effect.runPromise(connect(fakePort().port, await bodyWith()));
    await Effect.runPromise(disconnectGithubSvc(test.pool, acme.tenantId, "ada", saved.id));
    const { asked, record } = asks();
    const { port } = fakePort({ installation: async (id) => (record(id), infoOf()) });

    const [install] = await Effect.runPromise(listGithubInstallationsSvc(test.http, port, acme.tenantId, LATER));

    expect(asked).toEqual([]);
    expect(install?.status).toBe("removed");
  });

  it("reads the stored list and asks nothing when GitHub is not set up", async () => {
    await Effect.runPromise(connect(fakePort().port, await bodyWith()));

    const [install] = await Effect.runPromise(listGithubInstallationsSvc(test.http, null, acme.tenantId, LATER));

    expect(install?.checkedAt).toBe(NOW.toISOString());
  });
});

describe("listGithubBranchesSvc", () => {
  const connected = async () => Effect.runPromise(connect(fakePort().port, await bodyWith()));
  const ask = (port: GithubPort | null, installationId: string, accountId = acme.tenantId) => listGithubBranchesSvc(test.http, port, accountId, { installationId, repo: "octo/hello" });

  it("lists the branches of a repo the Account's connection covers, asking GitHub for that repo of that install", async () => {
    const saved = await connected();
    const asked: string[] = [];
    const { port } = fakePort({
      repoBranches: async (id, owner, name) => {
        asked.push(`${id}:${owner}/${name}`);
        return { defaultBranch: "main", branches: ["main", "dev"], truncated: true };
      },
    });

    const result = await Effect.runPromise(ask(port, saved.id));

    expect(result).toEqual({ defaultBranch: "main", branches: ["main", "dev"], truncated: true });
    expect(asked).toEqual(["42:octo/hello"]);
  });

  it("answers NotFound for an install of another account, and never asks GitHub", async () => {
    const saved = await connected();
    const asked = asks();
    const { port } = fakePort({ repoBranches: async (id) => (asked.record(id), null) });

    const error = await Effect.runPromise(Effect.flip(ask(port, saved.id, other.tenantId)));

    expect(error).toMatchObject({ _tag: "NotFound", message: "GitHub install not found" });
    expect(asked.asked).toEqual([]);
  });

  it("answers NotFound for a disconnected install, and never asks GitHub", async () => {
    const saved = await connected();
    await Effect.runPromise(disconnectGithubSvc(test.pool, acme.tenantId, "ada", saved.id));
    const asked = asks();
    const { port } = fakePort({ repoBranches: async (id) => (asked.record(id), null) });

    const error = await Effect.runPromise(Effect.flip(ask(port, saved.id)));

    expect(error._tag).toBe("NotFound");
    expect(asked.asked).toEqual([]);
  });

  it("answers NotFound when the install cannot see that repo", async () => {
    const saved = await connected();
    const { port } = fakePort({ repoBranches: async () => null });

    const error = await Effect.runPromise(Effect.flip(ask(port, saved.id)));

    expect(error).toMatchObject({ _tag: "NotFound", message: "This connection cannot see that repository" });
  });

  it("fails with ExternalError when GitHub cannot answer", async () => {
    const saved = await connected();
    const { port } = fakePort({
      repoBranches: async () => {
        throw new Error("down");
      },
    });

    const error = await Effect.runPromise(Effect.flip(ask(port, saved.id)));

    expect(error._tag).toBe("ExternalError");
  });

  it("fails with Invalid when GitHub is not set up", async () => {
    const saved = await connected();

    const error = await Effect.runPromise(Effect.flip(ask(null, saved.id)));

    expect(error._tag).toBe("Invalid");
  });
});

describe("disconnectGithubSvc", () => {
  const connected = async () => Effect.runPromise(connect(fakePort().port, await bodyWith()));
  const auditOf = (id: string) => test.raw.select().from(accessAuditLog).where(eq(accessAuditLog.subjectId, id));

  it("marks the install removed, writes who did it to the audit trail, and stops scans using it", async () => {
    const saved = await connected();

    const removed = await Effect.runPromise(disconnectGithubSvc(test.pool, acme.tenantId, "ada", saved.id));

    expect(removed).toMatchObject({ id: saved.id, status: "removed" });
    const entries = await auditOf(saved.id);
    expect(entries.filter((entry) => entry.action === "github.install.removed")).toMatchObject([
      { actorPartyId: acme.partyId, after: { tenantId: acme.tenantId, installationId: 42, accountLogin: "octo" } },
    ]);
    await expect(Effect.runPromise(neonInstallationRepo(test.http).findActive(acme.tenantId, 42))).resolves.toBeNull();
  });

  it("is harmless twice, and writes one audit row", async () => {
    const saved = await connected();

    await Effect.runPromise(disconnectGithubSvc(test.pool, acme.tenantId, "ada", saved.id));
    const again = await Effect.runPromise(disconnectGithubSvc(test.pool, acme.tenantId, "ada", saved.id));

    expect(again.status).toBe("removed");
    expect((await auditOf(saved.id)).filter((entry) => entry.action === "github.install.removed")).toHaveLength(1);
  });

  it("answers NotFound for an install of another account, and leaves it as it was", async () => {
    const saved = await connected();

    const error = await Effect.runPromise(Effect.flip(disconnectGithubSvc(test.pool, other.tenantId, "bob", saved.id)));

    expect(error).toMatchObject({ _tag: "NotFound", message: "GitHub install not found" });
    expect(await rows()).toMatchObject([{ status: "active" }]);
  });

  it("answers NotFound for an unknown id", async () => {
    const error = await Effect.runPromise(Effect.flip(disconnectGithubSvc(test.pool, acme.tenantId, "ada", crypto.randomUUID())));

    expect(error._tag).toBe("NotFound");
  });

  it("refuses a login that has no Party", async () => {
    const saved = await connected();

    const error = await Effect.runPromise(Effect.flip(disconnectGithubSvc(test.pool, acme.tenantId, "ghost", saved.id)));

    expect(error._tag).toBe("Forbidden");
    expect(await rows()).toMatchObject([{ status: "active" }]);
  });

  it("is undone by connecting the install again", async () => {
    const saved = await connected();
    await Effect.runPromise(disconnectGithubSvc(test.pool, acme.tenantId, "ada", saved.id));

    const again = await Effect.runPromise(connect(fakePort().port, await bodyWith()));

    expect(again).toMatchObject({ id: saved.id, status: "active" });
    await expect(Effect.runPromise(neonInstallationRepo(test.http).findActive(acme.tenantId, 42))).resolves.toMatchObject({ id: saved.id });
  });
});

describe("listGithubReposSvc", () => {
  const install = (tenantId: string, partyId: string, installationId: number, status = "active") =>
    test.raw
      .insert(tenantGithubInstallations)
      .values({ tenantId, installationId, accountLogin: "octo", repositorySelection: "all", status, connectedBy: partyId, noticeAcceptedAt: NOW })
      .returning()
      .then(([row]) => row);

  it("lists the repos of the active installs, sorted, each with the install it came from", async () => {
    const first = await install(acme.tenantId, acme.partyId, 42);
    const second = await install(acme.tenantId, acme.partyId, 43);
    const { port } = fakePort({ installationRepos: async (id) => (id === 42 ? [repo("zeta"), repo("open")] : [repo("alpha")]) });

    const repos = await Effect.runPromise(listGithubReposSvc(test.http, port, acme.tenantId));

    expect(repos).toEqual([
      { installationId: second.id, fullName: "octo/alpha", url: "https://github.com/octo/alpha", private: true },
      { installationId: first.id, fullName: "octo/open", url: "https://github.com/octo/open", private: false },
      { installationId: first.id, fullName: "octo/zeta", url: "https://github.com/octo/zeta", private: true },
    ]);
  });

  it("leaves out a removed or suspended install and another account's install", async () => {
    await install(acme.tenantId, acme.partyId, 42);
    await install(acme.tenantId, acme.partyId, 43, "removed");
    await install(acme.tenantId, acme.partyId, 44, "suspended");
    await install(other.tenantId, other.partyId, 99);
    const asked: number[] = [];
    const { port } = fakePort({
      installationRepos: async (id) => {
        asked.push(id);
        return [repo("a")];
      },
    });

    await Effect.runPromise(listGithubReposSvc(test.http, port, acme.tenantId));

    expect(asked).toEqual([42]);
  });

  it("still lists the others when one install cannot be read", async () => {
    await install(acme.tenantId, acme.partyId, 42);
    await install(acme.tenantId, acme.partyId, 43);
    const { port } = fakePort({
      installationRepos: async (id) => {
        if (id === 42) throw new Error("gone");
        return [repo("kept")];
      },
    });

    const repos = await Effect.runPromise(listGithubReposSvc(test.http, port, acme.tenantId));

    expect(repos.map((entry) => entry.fullName)).toEqual(["octo/kept"]);
  });

  it("lists nothing when GitHub is not set up", async () => {
    await install(acme.tenantId, acme.partyId, 42);

    await expect(Effect.runPromise(listGithubReposSvc(test.http, null, acme.tenantId))).resolves.toEqual([]);
  });
});
