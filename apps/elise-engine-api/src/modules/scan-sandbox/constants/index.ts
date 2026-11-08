// -----
// Container
// -----
export const SCAN_SANDBOX_INSTANCE_TYPE = "standard-1";
export const SCAN_SANDBOX_INACTIVITY_MS = 60 * 60 * 1000;
export const SCAN_SANDBOX_CA_PATH = "/etc/cloudflare/certs/cloudflare-containers-ca.crt";
export const SCAN_SANDBOX_TRUST_ENV = {
  NODE_EXTRA_CA_CERTS: SCAN_SANDBOX_CA_PATH,
  GIT_SSL_CAINFO: SCAN_SANDBOX_CA_PATH,
  CURL_CA_BUNDLE: SCAN_SANDBOX_CA_PATH,
  SSL_CERT_FILE: SCAN_SANDBOX_CA_PATH,
};
export const SCAN_SANDBOX_AGENT_ENV = {
  ...SCAN_SANDBOX_TRUST_ENV,
  ANTHROPIC_API_KEY: "placeholder",
  IS_SANDBOX: "1",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
};

// -----
// Paths in the container
// -----
export const SCAN_SANDBOX_WORK_DIR = "/workspace";
export const SCAN_SANDBOX_REPO_DIR = "/workspace/repo";
export const SCAN_SANDBOX_OUT_DIR = "/workspace/out";
export const SCAN_SANDBOX_PROMPT_PATH = "/workspace/prompt.txt";
export const SCAN_SANDBOX_AGENT_LOG = "/workspace/agent.log";
export const SCAN_SANDBOX_AGENT_ERR = "/workspace/agent.err";
export const SCAN_SANDBOX_AGENT_EXIT = "/workspace/agent.exit";
export const SCAN_SANDBOX_AGENT_LOCK = "/workspace/agent.lock";
export const SCAN_SANDBOX_CLONED_MARKER = "/workspace/repo.cloned";
export const SCAN_SANDBOX_COMMIT_FILE = "/workspace/repo.sha";
export const SCAN_SANDBOX_BRANCH_FILE = "/workspace/repo.branch";
export const SCAN_SANDBOX_KIND_FILE = "/workspace/repo.kind";
export const SCAN_SANDBOX_PRIOR_PATH = "/workspace/prior-findings.json";

// -----
// Clone
// -----
export const SCAN_SANDBOX_CLONE_TIMEOUT_S = 300;
export const SCAN_SANDBOX_KILL_AFTER_S = 5;
export const SCAN_SANDBOX_CLONE_GUARD_MS = (SCAN_SANDBOX_CLONE_TIMEOUT_S + 30) * 1000;
export const SCAN_SANDBOX_LOG_TAIL_CHARS = 2000;

// -----
// Outbound allowlist
// -----
export const SCAN_SANDBOX_ANTHROPIC_HOST = "api.anthropic.com";
export const SCAN_SANDBOX_GITHUB_HOST = "github.com";
export const SCAN_SANDBOX_GIT_READ_PATH = /^\/[\w.-]+\/[\w.-]+\/(info\/refs|git-upload-pack)$/;
export const SCAN_SANDBOX_ANTHROPIC_ROUTES = [
  "POST /v1/messages",
  "POST /v1/messages/count_tokens",
  "GET /api/claude_code/settings",
  "GET /api/claude_code/policy_limits",
];

// -----
// Metering: the Outbound proxy counts what the container spends.
// USD per million tokens. A model not listed is priced like the
// dearest one, so it still counts against the cap. Haiku is priced
// at its rate above 100K prompt tokens.
// -----
export const SCAN_SANDBOX_METER_KEY = "meter";
export const SCAN_SANDBOX_MAX_OUTPUT_TOKENS = 64000;
export const SCAN_SANDBOX_MODEL_PRICES = {
  "claude-haiku-5-5": { input: 0.5, output: 2.5, cacheRead: 0.05, cacheWrite: 0.625 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
} as const;
export const SCAN_SANDBOX_DEFAULT_PRICE = { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 } as const;
