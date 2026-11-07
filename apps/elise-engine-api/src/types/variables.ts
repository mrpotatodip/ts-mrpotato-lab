import type { Context } from "hono";
import type { MonthSpend } from "#/modules/usage";
import type { ScanSandbox } from "#/modules/scan-sandbox";
import type { ScanParams } from "#/schemas";

export type Bindings = {
  ENVIRONMENT: string;
  MODEL: string;
  EFFORT: string;
  MAX_BUDGET_USD: string;
  MAX_ACTIVE_SCANS: string;
  MONTHLY_BUDGET_USD: string;
  ANTHROPIC_API_KEY: string;
  SCAN_API_TOKEN: string;
  DATABASE_URL: string;
  AUTH_SECRET: string;
  AUTH_BASE_URL: string;
  AUTH_TRUSTED_ORIGINS: string;
  SIGN_UP_LIMITER?: RateLimit;
  SIGN_IN_LIMITER?: RateLimit;
  REPORTS: R2Bucket;
  SANDBOX: DurableObjectNamespace<ScanSandbox>;
  SCAN_WORKFLOW: Workflow<ScanParams>;
};

// -----
// The two questions the access checks ask, so a
// test can answer them without a database.
// -----
export type AppDeps = {
  monthSpend: (env: Bindings, accountId: string) => Promise<MonthSpend>;
  sessionUserId: (c: Context<AppEnv>) => Promise<string | undefined>;
  userHasAccount: (c: Context<AppEnv>, userId: string, accountId: string) => Promise<boolean>;
};

export type Variables = { userId?: string; deps: AppDeps };

export type AppEnv = { Bindings: Bindings; Variables: Variables };
