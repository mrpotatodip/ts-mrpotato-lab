import { Effect } from "effect";
import { FindingTriageBodySchema, type FindingTriageBody } from "@repo/contracts/elise";
import { accessAuditLog, authUser, partyPersons } from "@repo/db-elise";
import { scanFindings, scans } from "@repo/db-elise/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { listFindingsEffect, setTriageEffect } from "#/modules/findings/queries";

let test: TestDb;
let tenantId: string;
let repoId: string;
let partyId: string;

const REPO = "https://github.com/octocat/Hello-World";
const NOW = new Date("2026-11-10T00:00:00Z");
const DAY_MS = 86_400_000;
const fp = (letter: string) => letter.repeat(64);

const body = (letter: string, overrides: Partial<FindingTriageBody> = {}): FindingTriageBody => ({
  repo: REPO,
  fingerprint: fp(letter),
  status: "accepted_risk",
  note: "Behind the VPN until the rewrite",
  acceptDays: 30,
  ...overrides,
});

const set = (input: FindingTriageBody, serviceTokenOrLogin: string | null = "admin") => setTriageEffect(test.pool, tenantId, repoId, input, serviceTokenOrLogin ?? undefined, NOW);

// -----
// The audit rows about one problem, oldest first.
// -----
const auditOf = async (letter: string) => {
  const rows = await test.raw.select().from(accessAuditLog).orderBy(accessAuditLog.createdAt);
  // SAFETY: every row of this test is written by setTriageEffect, whose `after` is an object with a fingerprint.
  return rows.filter((row) => (row.after as { fingerprint?: string } | null)?.fingerprint === fp(letter));
};

beforeAll(async () => {
  test = await openTestDb();
  const seeded = await seedTenant(test, "acme");
  tenantId = seeded.tenantId;
  partyId = seeded.partyId;
  repoId = await seedRepo(test, tenantId, REPO);
  await test.raw.insert(authUser).values({ id: "admin", name: "Ada Rossi", email: "ada@example.com", partyId });
  await test.raw.insert(scans).values(scanValues(tenantId, repoId, "s1", "2026-11-01T00:00:00Z", { status: "succeeded" }));
  await test.raw.insert(scanFindings).values(
    ["a", "b"].map((letter) => ({ tenantId, scanId: "s1", findingId: `F-${letter}`, fingerprint: fp(letter), status: "confirmed" as const, severity: "high" as const, title: letter, class: "authz" })),
  );
});

afterAll(async () => {
  await test.close();
});

describe("an accepted risk", () => {
  it("is saved with its end date and shown on the finding", async () => {
    const saved = await Effect.runPromise(set(body("a")));
    const [finding] = await Effect.runPromise(listFindingsEffect(test.http, tenantId, { limit: 50, severity: "high" }));

    expect(saved).toMatchObject({ status: "accepted_risk", note: "Behind the VPN until the rewrite", acceptedUntil: new Date(NOW.getTime() + 30 * DAY_MS).toISOString() });
    expect(finding.triage?.acceptedUntil).toBe(saved.acceptedUntil);
  });

  it("writes an audit row that names the person", async () => {
    expect(await auditOf("a")).toEqual([
      expect.objectContaining({
        action: "finding.risk.accepted",
        actorPartyId: partyId,
        after: { tenantId, fingerprint: fp("a"), status: "accepted_risk", note: "Behind the VPN until the rewrite", acceptedUntil: new Date(NOW.getTime() + 30 * DAY_MS).toISOString() },
      }),
    ]);
  });

  it("is refused for the service token and for a login with no person behind it", async () => {
    expect((await Effect.runPromise(Effect.flip(set(body("b"), null))))._tag).toBe("Forbidden");
    expect((await Effect.runPromise(Effect.flip(set(body("b"), "nobody"))))._tag).toBe("Forbidden");
    expect(await auditOf("b")).toEqual([]);
  });

  it("is refused with no reason", async () => {
    expect((await Effect.runPromise(Effect.flip(set(body("b", { note: "  " })))))._tag).toBe("Invalid");
    expect(await auditOf("b")).toEqual([]);
  });
});

describe("every other decision", () => {
  it("writes an audit row, with no person when the service token set it", async () => {
    await Effect.runPromise(set(body("b", { status: "false_positive", note: "test fixture", acceptDays: undefined }), null));

    expect(await auditOf("b")).toEqual([
      expect.objectContaining({
        action: "finding.triage.set",
        actorPartyId: null,
        before: null,
        after: { tenantId, fingerprint: fp("b"), status: "false_positive", note: "test fixture", acceptedUntil: null },
      }),
    ]);
  });

  it("names the person when a login set it, and keeps the decision it replaced", async () => {
    await Effect.runPromise(set(body("b", { status: "open", note: null, acceptDays: undefined })));
    const rows = await auditOf("b");

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ action: "finding.triage.set", actorPartyId: partyId, before: { status: "false_positive", note: "test fixture", acceptedUntil: null } });
  });

  it("clears the end date, and records the accepted risk it ended", async () => {
    const saved = await Effect.runPromise(set(body("a", { status: "fixed", note: null, acceptDays: undefined })));
    const rows = await auditOf("a");

    expect(saved).toMatchObject({ status: "fixed", acceptedUntil: null });
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ action: "finding.triage.set", before: { status: "accepted_risk", acceptedUntil: new Date(NOW.getTime() + 30 * DAY_MS).toISOString() } });
  });
});

describe("FindingTriageBodySchema", () => {
  it("needs a reason and 1 to 90 days for an accepted risk", () => {
    expect(FindingTriageBodySchema.safeParse(body("a")).success).toBe(true);
    expect(FindingTriageBodySchema.safeParse(body("a", { note: undefined })).success).toBe(false);
    expect(FindingTriageBodySchema.safeParse(body("a", { acceptDays: undefined })).success).toBe(false);
    expect(FindingTriageBodySchema.safeParse(body("a", { acceptDays: 91 })).success).toBe(false);
    expect(FindingTriageBodySchema.safeParse(body("a", { acceptDays: 0 })).success).toBe(false);
  });

  it("allows days only on an accepted risk", () => {
    expect(FindingTriageBodySchema.safeParse(body("a", { status: "fixed" })).success).toBe(false);
    expect(FindingTriageBodySchema.safeParse(body("a", { status: "fixed", acceptDays: undefined })).success).toBe(true);
  });
});

describe("who decided", () => {
  it("is named on the saved decision and in the list", async () => {
    await test.raw.insert(partyPersons).values({ partyId, firstName: "Ada", lastName: "Rossi" }).onConflictDoUpdate({ target: partyPersons.partyId, set: { firstName: "Ada", lastName: "Rossi" } });

    const saved = await Effect.runPromise(set(body("b", { status: "fixed", note: null, acceptDays: undefined })));
    const listed = await Effect.runPromise(listFindingsEffect(test.http, tenantId, { limit: 50 }));

    expect(saved.decidedBy).toBe("Ada Rossi");
    expect(listed.find((finding) => finding.fingerprint === fp("b"))?.triage?.decidedBy).toBe("Ada Rossi");
  });

  it("is no one when the service token decided", async () => {
    const saved = await Effect.runPromise(set(body("b", { status: "false_positive", note: null, acceptDays: undefined }), null));

    expect(saved.decidedBy).toBeNull();
  });
});
