import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { accessAuditLog, authUser, tenantAnthropicKeys } from "@repo/db-elise/schema";
import { openTestDb, seedTenant, type TestDb } from "#/__tests__/test-db";
import { getAnthropicKeySvc, removeAnthropicKeySvc, setAnthropicKeySvc } from "#/modules/anthropic-key/handlers";
import { findSealedKeyEffect } from "#/modules/anthropic-key/queries";
import { openKey } from "#/modules/anthropic-key/utils";

const SECRET = "test-secret-test-secret-test-secret";
const KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz-w3Zq";

let test: TestDb;
let acme: { tenantId: string; partyId: string };
let other: { tenantId: string; partyId: string };
let userId: string;
let round = 0;

beforeAll(async () => {
  test = await openTestDb();
});

// -----
// The audit log is append-only, so each test gets its own account
// and login, and reads only the rows about its own account.
// -----
beforeEach(async () => {
  round += 1;
  await test.raw.delete(tenantAnthropicKeys);
  acme = await seedTenant(test, `acme-${round}`);
  other = await seedTenant(test, `other-${round}`);
  userId = `ada-${round}`;
  await test.raw.insert(authUser).values({ id: userId, name: "Ada Rossi", email: `ada-${round}@example.com`, partyId: acme.partyId });
});

afterAll(async () => {
  await test.close();
});

const accepts = async () => true;
const refuses = async () => false;
const set = (check: (apiKey: string) => Promise<boolean>, apiKey = KEY, secret: string | null = SECRET) =>
  setAnthropicKeySvc(secret ?? undefined, test.pool, check, acme.tenantId, userId, apiKey);
const auditOf = (accountId: string) => test.raw.select().from(accessAuditLog).where(eq(accessAuditLog.subjectId, accountId));

describe("setAnthropicKeySvc", () => {
  it("stores the key sealed, shows only its last four, and records who set it without the key", async () => {
    const saved = await Effect.runPromise(set(accepts));

    expect(saved).toMatchObject({ source: "account", lastFour: "w3Zq" });
    const [row] = await test.raw.select().from(tenantAnthropicKeys).where(eq(tenantAnthropicKeys.tenantId, acme.tenantId));
    expect(row.sealedKey).not.toContain("sk-ant");
    expect(await openKey(SECRET, acme.tenantId, row.sealedKey)).toBe(KEY);
    const [entry] = await auditOf(acme.tenantId);
    expect(entry).toMatchObject({ action: "anthropic.key.set", actorPartyId: acme.partyId, after: { tenantId: acme.tenantId, lastFour: "w3Zq" } });
    expect(JSON.stringify(entry)).not.toContain(KEY);
  });

  it("replaces an earlier key with the new one", async () => {
    await Effect.runPromise(set(accepts));
    await Effect.runPromise(set(accepts, "sk-ant-api03-another-key-for-the-same-account-n3wK"));

    expect(await test.raw.select().from(tenantAnthropicKeys)).toHaveLength(1);
    expect(await Effect.runPromise(getAnthropicKeySvc(test.http, acme.tenantId))).toMatchObject({ lastFour: "n3wK" });
  });

  it.each([
    ["Anthropic refuses the key", refuses, SECRET, "did not accept"],
    ["the server has no encryption secret", accepts, null, "not set up"],
  ])("refuses and saves nothing when %s", async (_name, check, secret, message) => {
    const failure = await Effect.runPromise(Effect.flip(set(check, KEY, secret)));

    expect(failure).toMatchObject({ _tag: "Invalid", message: expect.stringContaining(message) });
    expect(await test.raw.select().from(tenantAnthropicKeys)).toHaveLength(0);
  });

  it("calls an Anthropic outage an external error, not a bad key", async () => {
    const failure = await Effect.runPromise(
      Effect.flip(
        set(async () => {
          throw new Error("Anthropic answered 529");
        }),
      ),
    );

    expect(failure._tag).toBe("ExternalError");
    expect(await test.raw.select().from(tenantAnthropicKeys)).toHaveLength(0);
  });
});

describe("the key an account's scans use", () => {
  it("is the platform's until an account brings one, and only that account's", async () => {
    const before = await Effect.runPromise(getAnthropicKeySvc(test.http, acme.tenantId));
    await Effect.runPromise(set(accepts));

    expect(before).toEqual({ source: "platform", lastFour: null, updatedAt: null });
    expect(await Effect.runPromise(findSealedKeyEffect(test.http, acme.tenantId))).not.toBeNull();
    expect(await Effect.runPromise(findSealedKeyEffect(test.http, other.tenantId))).toBeNull();
    expect(await Effect.runPromise(getAnthropicKeySvc(test.http, other.tenantId))).toMatchObject({ source: "platform" });
  });
});

describe("removeAnthropicKeySvc", () => {
  it("goes back to the platform key and records the removal", async () => {
    await Effect.runPromise(set(accepts));

    const removed = await Effect.runPromise(removeAnthropicKeySvc(test.pool, acme.tenantId, userId));

    expect(removed).toEqual({ source: "platform", lastFour: null, updatedAt: null });
    expect(await test.raw.select().from(tenantAnthropicKeys)).toHaveLength(0);
    expect((await auditOf(acme.tenantId)).map((entry) => entry.action)).toEqual(["anthropic.key.set", "anthropic.key.removed"]);
    expect((await auditOf(acme.tenantId))[1]).toMatchObject({ before: { lastFour: "w3Zq" } });
  });

  it("changes nothing and records nothing when there is no key", async () => {
    await Effect.runPromise(removeAnthropicKeySvc(test.pool, acme.tenantId, userId));

    expect(await auditOf(acme.tenantId)).toHaveLength(0);
  });
});
