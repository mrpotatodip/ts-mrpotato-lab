import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scans, tenantCreditLedger } from "@repo/db-elise/schema";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { creditEntriesEffect } from "#/modules/credit";

let test: TestDb;
let tenantId: string;

const entries = (query: { limit: number; cursor?: string }, tenant = tenantId) => Effect.runPromise(creditEntriesEffect(test.http, tenant, query));
const at = (minute: number) => new Date(Date.UTC(2026, 10, 11, 10, minute));

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  const repoId = await seedRepo(test, tenantId);
  for (const id of ["scan-a", "scan-b"]) await test.raw.insert(scans).values(scanValues(tenantId, repoId, id, "2026-11-11T00:00:00Z"));
  await test.raw.insert(tenantCreditLedger).values([
    { tenantId, kind: "grant", amountUsd: "49.0000", createdAt: at(0) },
    { tenantId, kind: "scan_hold", amountUsd: "-1.5000", scanId: "scan-a", createdAt: at(1) },
    { tenantId, kind: "scan_settle", amountUsd: "1.2000", scanId: "scan-a", createdAt: at(2) },
    { tenantId, kind: "topup", amountUsd: "20.0000", idempotencyKey: "pi_1", createdAt: at(3) },
    { tenantId, kind: "scan_hold", amountUsd: "-1.5000", scanId: "scan-b", createdAt: at(4) },
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("creditEntriesEffect", () => {
  it("shows a settled scan as one entry with its charge, and a running scan as its hold", async () => {
    const { entries: list } = await entries({ limit: 10 });

    expect(list.map((entry) => [entry.kind, entry.amountUsd, entry.scanId])).toEqual([
      ["scan_hold", -1.5, "scan-b"],
      ["topup", 20, null],
      ["scan_settle", -0.3, "scan-a"],
      ["grant", 49, null],
    ]);
  });

  it("pages newest first, and the last page has no cursor", async () => {
    const first = await entries({ limit: 3 });
    const second = await entries({ limit: 3, cursor: first.nextCursor ?? undefined });

    expect(first.entries.map((entry) => entry.kind)).toEqual(["scan_hold", "topup", "scan_settle"]);
    expect(first.nextCursor).toBe(first.entries[2].id);
    expect(second.entries.map((entry) => entry.kind)).toEqual(["grant"]);
    expect(second.nextCursor).toBeNull();
  });

  it("shows nothing of another account", async () => {
    const other = (await seedTenant(test, "other")).tenantId;

    expect(await entries({ limit: 10 }, other)).toEqual({ entries: [], nextCursor: null });
  });
});
