import type { Context } from "hono";
import type { AccessPower } from "@repo/contracts/elise";
import type { GithubAccess } from "#/modules/github-installs";
import type { ScanRepo } from "#/modules/scan-ledger";
import type { MonthSpend } from "#/modules/usage";
import type { ScanSandbox } from "#/modules/scan-sandbox";
import type { InviteEmail } from "#/modules/team/types";
import type { ScanParams } from "#/schemas";

export type Bindings = {
  ENVIRONMENT: string;
  MODEL: string;
  EFFORT: string;
  MAX_BUDGET_USD: string;
  MAX_ACTIVE_SCANS: string;
  MONTHLY_BUDGET_USD: string;
  ANTHROPIC_API_KEY: string;
  KEY_ENCRYPTION_SECRET?: string;
  SCAN_API_TOKEN: string;
  DATABASE_URL: string;
  AUTH_SECRET: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_APP_CLIENT_ID?: string;
  GITHUB_APP_CLIENT_SECRET?: string;
  AUTH_BASE_URL: string;
  AUTH_TRUSTED_ORIGINS: string;
  SIGN_UP_LIMITER?: RateLimit;
  SIGN_IN_LIMITER?: RateLimit;
  TEAM_INVITE_LIMITER?: RateLimit;
  DASHBOARD_URL: string;
  INVITE_FROM: string;
  EMAIL: SendEmail;
  INVITE_EMAIL_QUEUE: Queue<InviteEmail>;
  REPORTS: R2Bucket;
  SANDBOX: DurableObjectNamespace<ScanSandbox>;
  SCAN_WORKFLOW: Workflow<ScanParams>;
};

// -----
// The two questions the access checks ask, so a
// test can answer them without a database.
// -----
export type AppDeps = {
  scanRepo: (env: Bindings) => ScanRepo;
  githubAccess: (env: Bindings, accountId: string) => GithubAccess;
  monthSpend: (env: Bindings, accountId: string) => Promise<MonthSpend>;
  sessionUserId: (c: Context<AppEnv>) => Promise<string | undefined>;
  userHasAccount: (c: Context<AppEnv>, userId: string, accountId: string) => Promise<boolean>;
  userHasPower: (c: Context<AppEnv>, userId: string, accountId: string, power: AccessPower) => Promise<boolean>;
  enqueueInviteEmail: (env: Bindings, mail: InviteEmail) => Promise<void>;
};

export type Variables = { userId?: string; deps: AppDeps };

export type AppEnv = { Bindings: Bindings; Variables: Variables };
