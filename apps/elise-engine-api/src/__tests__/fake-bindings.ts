import type { ScanParams } from "#/schemas";
import type { Bindings } from "#/types/variables";

export const TEST_TOKEN = "test-token-test-token";

type Created = { id: string; params: ScanParams };
type WorkflowStatus = { status: string; error?: { name: string; message: string } };

export function fakeBindings(overrides: Partial<Bindings> = {}, workflowStatus: WorkflowStatus = { status: "running" }) {
  const store = new Map<string, string>();
  const created: Created[] = [];

  const reports = {
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    get: async (key: string) => {
      const value = store.get(key);
      if (value === undefined) return null;
      return { body: value, json: async () => JSON.parse(value), text: async () => value };
    },
    list: async (options: { prefix: string; limit?: number; cursor?: string }) => {
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

  const workflow = {
    create: async (options: Created) => {
      created.push(options);
    },
    get: async () => ({ status: async () => workflowStatus }),
  };

  // SAFETY: the routes under test read only the bindings listed here.
  const env = {
    ENVIRONMENT: "production",
    MODEL: "claude-sonnet-5-5",
    EFFORT: "high",
    MAX_BUDGET_USD: "2",
    MAX_ACTIVE_SCANS: "3",
    ANTHROPIC_API_KEY: "test-key",
    SCAN_API_TOKEN: TEST_TOKEN,
    REPORTS: reports,
    SCAN_WORKFLOW: workflow,
    ...overrides,
  } as never;

  return { env, store, created };
}
