import type { Context } from "hono";
import type { Effect } from "effect";
import type { AccessPower, RunnerIdentity, ScanUsage } from "@repo/contracts/elise";
import type { PoolDbType, TenantDbType } from "#/lib/db-connection";
import type { StripeGateway } from "#/modules/stripe/types";
import type { DbError, Invalid } from "#/lib/effect-query";
import type { ScanArchiveLink } from "#/modules/archives/queries";
import type { HoldResult, SettleResult } from "#/modules/credit";
import type { ScanRepo } from "#/modules/scan-ledger";
import type { MonthSpend } from "#/modules/usage";
import type { FullScanSandbox } from "#/modules/scan-sandbox";
import type { QueuedEmail } from "#/modules/email";
import type { ScanParams } from "#/schemas";

export type Bindings = {
  ENVIRONMENT: string;
  MODEL: string;
  EFFORT: string;
  MAX_BUDGET_FULL_USD: string;
  MAX_ACTIVE_SCANS: string;
  MAX_ACTIVE_FULL_SCANS: string;
  MONTHLY_BUDGET_USD: string;
  BUDGET_ALLOWANCE_USD: string;
  BILLING_ENFORCED: string;
  ANTHROPIC_API_KEY: string;
  KEY_ENCRYPTION_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SCAN_API_TOKEN: string;
  DATABASE_URL: string;
  HYPERDRIVE_TENANT: Hyperdrive;
  AUTH_SECRET: string;
  AUTH_BASE_URL: string;
  AUTH_TRUSTED_ORIGINS: string;
  SIGN_UP_LIMITER?: RateLimit;
  SIGN_IN_LIMITER?: RateLimit;
  TEAM_INVITE_LIMITER?: RateLimit;
  RUNNER_ENROLL_LIMITER?: RateLimit;
  RUNNER_ENROLL_TOTAL_LIMITER?: RateLimit;
  RUNNER_LOGIN_START_LIMITER?: RateLimit;
  RUNNER_LOGIN_START_TOTAL_LIMITER?: RateLimit;
  PASSWORD_RESET_LIMITER?: RateLimit;
  PASSWORD_RESET_ADDRESS_LIMITER?: RateLimit;
  DASHBOARD_URL: string;
  EMAIL_FROM: string;
  EMAIL: SendEmail;
  EMAIL_QUEUE: Queue<QueuedEmail>;
  REPORTS: R2Bucket;
  SANDBOX_FULL: DurableObjectNamespace<FullScanSandbox>;
  SCAN_WORKFLOW_FULL: Workflow<ScanParams>;
};

// -----
// The two questions the access checks ask, so a
// test can answer them without a database.
// -----
export type AppDeps = {
  scanRepo: (env: Bindings, db: TenantDbType) => ScanRepo;
  monthSpend: (db: TenantDbType, accountId: string) => Effect.Effect<MonthSpend, DbError>;
  holdCredit: (db: TenantDbType, accountId: string, scanId: string, holdUsd: number) => Effect.Effect<HoldResult, DbError>;
  connectedRunnerSources: (db: TenantDbType, accountId: string, runnerId: string) => Effect.Effect<string[] | null, DbError>;
  linkArchive: (db: TenantDbType, accountId: string, link: ScanArchiveLink) => Effect.Effect<void, Invalid | DbError>;
  releaseCredit: (db: TenantDbType, accountId: string, scanId: string) => Effect.Effect<SettleResult, DbError>;
  teardownScan: (env: Bindings, scanId: string) => Promise<ScanUsage | null>;
  sessionUserId: (c: Context<AppEnv>) => Promise<string | undefined>;
  runnerIdentity: (c: Context<AppEnv>, token: string) => Promise<RunnerIdentity | null>;
  userHasAccount: (c: Context<AppEnv>, userId: string, accountId: string) => Promise<boolean>;
  userHasPower: (c: Context<AppEnv>, userId: string, accountId: string, power: AccessPower) => Promise<boolean>;
  enqueueEmail: (env: Bindings, mail: QueuedEmail) => Promise<void>;
  withTenant: <T>(c: Context<AppEnv>, accountId: string, run: (db: TenantDbType) => Promise<T>) => Promise<T>;
  withOwner: <T>(c: Context<AppEnv>, run: (db: PoolDbType) => Promise<T>) => Promise<T>;
  stripe: (env: Bindings) => StripeGateway;
};

export type Variables = { userId?: string; deps: AppDeps };

export type AppEnv = { Bindings: Bindings; Variables: Variables };
