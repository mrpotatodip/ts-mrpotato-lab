import type { ScanSandbox } from "#/modules/scan-sandbox";
import type { ScanParams } from "#/schemas";

export type Bindings = {
  ENVIRONMENT: string;
  MODEL: string;
  EFFORT: string;
  MAX_BUDGET_USD: string;
  MAX_ACTIVE_SCANS: string;
  ANTHROPIC_API_KEY: string;
  SCAN_API_TOKEN: string;
  DATABASE_URL: string;
  REPORTS: R2Bucket;
  SANDBOX: DurableObjectNamespace<ScanSandbox>;
  SCAN_WORKFLOW: Workflow<ScanParams>;
};

export type AppEnv = { Bindings: Bindings };
