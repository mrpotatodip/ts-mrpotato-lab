import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scans } from "@repo/db-elise/schema";
import { openTestDb, scanValues, seedRepo, seedTenant, type TestDb } from "#/__tests__/test-db";
import { addTopupEffect, balanceEffect, holdCreditEffect, renewCreditEffect, settleCreditEffect } from "#/modules/credit";

let test: TestDb;
let tenantId: string;
let repoId: string;

const balance = (tenant = tenantId) => Effect.runPromise(balanceEffect(test.http, tenant));
const renew = (key: string, grantUsd = 49, capUsd: number | null = 100) =>
  Effect.runPromise(renewCreditEffect(test.pool, { tenantId, grantUsd, capUsd, idempotencyKey: key }));
const hold = (scanId: string, holdUsd: number) => Effect.runPromise(holdCreditEffect(test.pool, { tenantId, scanId, holdUsd }));
const settle = (scanId: string, chargeUsd: number) => Effect.runPromise(settleCreditEffect(test.pool, { tenantId, scanId, chargeUsd }));
const addScan = (id: string) => test.raw.insert(scans).values(scanValues(tenantId, repoId, id, "2026-11-11T00:00:00Z"));

beforeAll(async () => {
  test = await openTestDb();
  tenantId = (await seedTenant(test, "acme")).tenantId;
  repoId = await seedRepo(test, tenantId);
  for (const id of ["scan-a", "scan-b", "scan-c", "scan-d"]) await addScan(id);
});

afterAll(async () => {
  await test.close();
});

describe("the credit balance", () => {
  it("starts at zero for an account with no entries", async () => {
    expect(await balance()).toBe(0);
  });

  it("adds a renewal once however many times its webhook arrives", async () => {
    expect(await renew("in_1")).toEqual({ grantedUsd: 49, duplicate: false });
    expect(await renew("in_1")).toEqual({ grantedUsd: 0, duplicate: true });

    expect(await balance()).toBe(49);
  });

  it("holds a renewal at the cap and never takes credit away", async () => {
    expect(await renew("in_2")).toEqual({ grantedUsd: 49, duplicate: false });
    expect(await renew("in_3")).toEqual({ grantedUsd: 2, duplicate: false });
    expect(await renew("in_4")).toEqual({ grantedUsd: 0, duplicate: false });

    expect(await balance()).toBe(100);
  });

  it("does not add credit when a capped renewal's webhook repeats after the customer spent some", async () => {
    expect((await hold("scan-a", 30)).held).toBe(true);

    expect(await renew("in_4")).toEqual({ grantedUsd: 0, duplicate: true });
    expect(await balance()).toBe(70);
  });

  it("adds a topup once and past the cap", async () => {
    const add = () => Effect.runPromise(addTopupEffect(test.http, { tenantId, amountUsd: 100, idempotencyKey: "cs_1" }));

    expect(await add()).toBe(true);
    expect(await add()).toBe(false);
    expect(await balance()).toBe(170);
  });
});

describe("a scan's hold and settlement", () => {
  it("refuses a hold the balance cannot cover and takes nothing", async () => {
    const before = await balance();

    expect(await hold("scan-b", before + 1)).toEqual({ held: false, balanceUsd: before });
    expect(await balance()).toBe(before);
  });

  it("holds once for a scan however many times it is asked", async () => {
    const before = await balance();
    await hold("scan-b", 3);
    await hold("scan-b", 3);

    expect(await balance()).toBe(before - 3);
  });

  it("settles to the real charge and gives back the rest of the hold", async () => {
    const before = await balance();

    expect(await settle("scan-b", 0.315)).toEqual({ settled: true, chargeUsd: 0.315 });
    expect(await balance()).toBeCloseTo(before + 3 - 0.315, 4);
  });

  it("settles a scan once", async () => {
    const before = await balance();

    expect(await settle("scan-b", 0.315)).toEqual({ settled: false, chargeUsd: 0.315 });
    expect(await balance()).toBe(before);
  });

  it("gives the whole hold back when the scan cost nothing", async () => {
    await hold("scan-c", 3);
    const before = await balance();
    await settle("scan-c", 0);

    expect(await balance()).toBeCloseTo(before + 3, 4);
  });

  it("takes nothing for a scan that never held credit", async () => {
    const before = await balance();

    expect(await settle("scan-d", 1)).toEqual({ settled: false, chargeUsd: 0 });
    expect(await balance()).toBe(before);
  });

  it("keeps one account's credit out of another's balance", async () => {
    const other = (await seedTenant(test, "other")).tenantId;

    expect(await balance(other)).toBe(0);
  });
});
