import type { ScanParams } from "#/schemas";
import type { Bindings } from "#/types/variables";

export const TEST_TOKEN = "test-token-test-token";

// SAFETY: the app calls only waitUntil and passThroughOnException on the context.
const executionContext = { waitUntil: () => undefined, passThroughOnException: () => undefined } as never;

export const testExecutionContext: ExecutionContext = executionContext;

type Created = { id: string; params: ScanParams };
type WorkflowStatus = { status: string; error?: { name: string; message: string } };

export function fakeBindings(overrides: Partial<Bindings> = {}, workflowStatus: WorkflowStatus = { status: "running" }) {
  const store = new Map<string, string>();
  const uploadedAt = new Map<string, Date>();
  const createdFull: Created[] = [];

  const reports = {
    put: async (key: string, value: string) => {
      store.set(key, value);
      uploadedAt.set(key, new Date());
    },
    delete: async (keys: string | string[]) => {
      for (const key of [keys].flat()) {
        store.delete(key);
        uploadedAt.delete(key);
      }
    },
    get: async (key: string) => {
      const value = store.get(key);
      if (value === undefined) return null;
      return { body: value, json: async () => JSON.parse(value), text: async () => value };
    },
    list: async (options: { prefix: string; limit?: number; cursor?: string; delimiter?: string }) => {
      if (options.delimiter === undefined) {
        const keys = [...store.keys()].filter((key) => key.startsWith(options.prefix)).toSorted();
        const start = Number(options.cursor ?? 0);
        const limit = options.limit ?? 1000;
        const truncated = start + limit < keys.length;
        const objects = keys.slice(start, start + limit).map((key) => ({ key, uploaded: uploadedAt.get(key) ?? new Date() }));
        return { objects, delimitedPrefixes: [], truncated, cursor: truncated ? String(start + limit) : undefined };
      }
      const prefixes = [
        ...new Set(
          [...store.keys()]
            .filter((key) => key.startsWith(options.prefix))
            .map((key) => `${options.prefix}${key.slice(options.prefix.length).split("/")[0]}/`),
        ),
      ].toSorted();
      const start = Number(options.cursor ?? 0);
      const limit = options.limit ?? 1000;
      const page = prefixes.slice(start, start + limit);
      const truncated = start + limit < prefixes.length;
      return { objects: [], delimitedPrefixes: page, truncated, cursor: truncated ? String(start + limit) : undefined };
    },
  };

  const workflowInto = (into: Created[]) => ({
    create: async (options: Created) => {
      into.push(options);
    },
    get: async () => ({ status: async () => workflowStatus }),
  });
  const workflowFull = workflowInto(createdFull);

  // SAFETY: the routes under test read only the bindings listed here.
  const env: Bindings = {
    ENVIRONMENT: "production",
    MODEL: "claude-sonnet-5-5",
    EFFORT: "high",
    MAX_BUDGET_FULL_USD: "18",
    MAX_ACTIVE_SCANS: "3",
    MAX_ACTIVE_FULL_SCANS: "1",
    MONTHLY_BUDGET_USD: "20",
    BUDGET_ALLOWANCE_USD: "1000",
    BILLING_ENFORCED: "false",
    ANTHROPIC_API_KEY: "test-key",
    SCAN_API_TOKEN: TEST_TOKEN,
    DATABASE_URL: "postgresql://user:pass@127.0.0.1:1/none",
    AUTH_SECRET: "test-auth-secret-test-auth-secret",
    AUTH_BASE_URL: "http://localhost",
    DASHBOARD_URL: "https://app.example.com",
    AUTH_TRUSTED_ORIGINS: "http://localhost",
    REPORTS: reports,
    SCAN_WORKFLOW_FULL: workflowFull,
    ...overrides,
  } as never;

  return { env, store, uploadedAt, createdFull };
}
