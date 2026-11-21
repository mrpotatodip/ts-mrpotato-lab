import { Effect } from "effect";
import type { AppDeps } from "#/types/variables";
import { fakeStripe } from "./fake-stripe";
import { memoryScanRepo } from "./memory-scan-repo";
import { noOwnerDb, noTenantDb } from "./no-tenant-db";

// -----
// Every AppDeps a route test needs, answered without a database: no
// session, a caller who holds a role and every Power, a fresh ledger,
// no tenant database. A test passes only the deps it
// changes, so a new dep is added here once, not in every test file.
// -----
export const testDeps = (overrides: Partial<AppDeps> = {}): AppDeps => ({
  scanRepo: () => memoryScanRepo().repo,
  monthSpend: () => Effect.succeed({ spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null, budgetAllowanceUsd: null, platformSpentUsd: 0, platformReservedUsd: 0, ownKey: true, plan: null }),
  holdCredit: () => Effect.succeed({ held: true, balanceUsd: 0 }),
  connectedRunnerSources: () => Effect.succeed(["git", "archive"]),
  linkArchive: () => Effect.void,
  releaseCredit: () => Effect.succeed({ settled: true, chargeUsd: 0 }),
  teardownScan: async () => null,
  sessionUserId: async () => undefined,
  runnerIdentity: async () => null,
  userHasAccount: async () => true,
  userHasPower: async () => true,
  enqueueEmail: async () => undefined,
  withTenant: noTenantDb,
  withOwner: noOwnerDb,
  stripe: () => fakeStripe().gateway,
  ...overrides,
});
