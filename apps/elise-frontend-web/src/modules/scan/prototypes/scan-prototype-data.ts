import type { Usage } from "@repo/contracts/elise";
import type { Finding, Overview, ScanStatus } from "../schemas";

const HOUR = 3_600_000;
const SCAN_COUNT = 40;
const OVERVIEW_SAMPLE = 10;

const REPOS = [
  "vercel/next.js",
  "honojs/hono",
  "colinhacks/zod",
  "acme-payments/payments-service",
  "drizzle-team/drizzle-orm",
  "tanstack/router",
  "elysiajs/elysia",
  "trpc/trpc",
  "cloudflare/workers-sdk",
  "prisma/prisma",
  "supabase/supabase",
  "calcom/cal.com",
  "organization-with-a-long-name/an-unusually-long-repository-name-for-layout-testing",
  "t3-oss/create-t3-app",
];

const MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"] as const;
const EFFORTS = ["high", "medium", "xhigh", "low", "max"] as const;
const PROFILES = ["quick", "standard", "deep"] as const;

const ERRORS = [
  "Clone failed: repository is private or does not exist.",
  "The scan ran out of budget before it finished. Raise the budget or lower the effort and try again.",
  "The sandbox stopped responding after 20 minutes and was shut down.",
];

type FindingTemplate = Pick<Finding, "title" | "severity" | "place">;

const TEMPLATES: readonly FindingTemplate[] = [
  { title: "SQL injection in report export endpoint", severity: "critical", place: { file: "src/routes/export.ts", line: 88 } },
  { title: "Hard-coded signing secret committed to the repository", severity: "critical", place: { file: "config/auth.production.json", line: 12 } },
  { title: "Missing authorization check on webhook replay", severity: "high", place: { file: "src/webhooks/replay.ts", line: 41 } },
  { title: "Server-side request forgery through the avatar import URL", severity: "high", place: { file: "src/modules/profile/import-avatar.ts", line: 63 } },
  { title: "JWT accepted with the `none` algorithm when the header is malformed", severity: "high", place: { file: "src/auth/verify-token.ts", line: 27 } },
  { title: "Session cookie lacks the SameSite attribute", severity: "medium", place: { file: "src/auth/session.ts", line: 17 } },
  { title: "Rate limiting is applied per process, so it resets on every deploy", severity: "medium", place: { file: "src/middleware/rate-limit.ts", line: 9 } },
  { title: "Open redirect after sign-in through the `next` query parameter", severity: "medium", place: { file: "src/routes/sign-in.tsx", line: 55 } },
  { title: "Uploaded file names are used in storage paths without normalization", severity: "medium", place: { file: "src/storage/upload.ts", line: 102 } },
  { title: "Verbose error response leaks a stack trace", severity: "low", place: { file: "src/lib/errors.ts", line: 203 } },
  { title: "CORS allows credentials for every origin in development mode", severity: "low", place: { file: "src/server.ts", line: 31 } },
  { title: "Password reset tokens are not invalidated after use", severity: "low", place: { file: "src/auth/reset-password.ts", line: 74 } },
  { title: "Outdated dependency with a known advisory (lodash 4.17.15)", severity: "informational", place: { file: "package.json", line: 34 } },
  { title: "Security headers are not set on static asset responses", severity: "informational", place: { file: "src/server.ts", line: 148 } },
  { title: "Logging includes the full request body for failed sign-ins", severity: "low", place: { file: "src/auth/sign-in.ts", line: 88 } },
  { title: "Dependency install runs unpinned scripts in the CI workflow", severity: "medium", place: { file: ".github/workflows/release.yml", line: 22 } },
];

const STATES: readonly Finding["state"][] = ["confirmed", "confirmed", "confirmed", "needs_validation", "confirmed", "confirmed", "needs_validation", "confirmed"];

export type ScanPrototypeFile = { name: string; content: string };

export type ScanPrototypeEntry = {
  scan: ScanStatus;
  findings: Finding[];
  files: ScanPrototypeFile[];
};

export const PROTOTYPE_FEATURED = [
  { scanId: "demo-0", title: "Running", detail: "A scan in progress, with the live banner and no files yet." },
  { scanId: "demo-1", title: "Queued", detail: "A scan waiting for a free slot." },
  { scanId: "demo-2", title: "Clean report", detail: "A finished scan with no findings." },
  { scanId: "demo-3", title: "Failed", detail: "A scan that failed with an engine message." },
  { scanId: "demo-4", title: "Full audit, many findings", detail: "A deep full-skill scan with 16 findings and a long report." },
] as const;

function scanFor(index: number, now: number): ScanStatus {
  const status = index === 0 ? "running" : index === 1 ? "queued" : index % 8 === 3 ? "failed" : "succeeded";
  const full = index === 4 || (index > 4 && index % 4 === 1);
  const created = now - (index * 17 + (index % 5) * 3) * HOUR - index * 61_000;
  const finishedAfter = (18 + (index % 7) * 9) * 60_000;
  const finished = status === "succeeded" || status === "failed" ? new Date(created + finishedAfter).toISOString() : null;
  const files = status === "succeeded" ? (full ? ["REPORT.md", "findings.json", "threat-model.md"] : ["REPORT.md", "findings.json"]) : null;

  return {
    scanId: `demo-${index}`,
    accountId: "demo-account",
    repo: `https://github.com/${REPOS[index % REPOS.length]}`,
    repoId: `demo-repo-${index % REPOS.length}`,
    status,
    skill: full ? "full" : "lite",
    profile: full ? (index === 4 ? "deep" : (PROFILES[index % PROFILES.length] ?? "quick")) : "quick",
    model: MODELS[index % MODELS.length] ?? "claude-sonnet-5-5",
    effort: index === 4 ? "max" : (EFFORTS[index % EFFORTS.length] ?? "high"),
    maxBudgetUsd: full ? 6 : 2,
    createdAt: new Date(created).toISOString(),
    updatedAt: new Date(finished ? Date.parse(finished) : now).toISOString(),
    finishedAt: finished,
    error: status === "failed" ? (ERRORS[index % ERRORS.length] ?? null) : null,
    files,
  };
}

function findingsFor(scan: ScanStatus, index: number): Finding[] {
  if (scan.status !== "succeeded" || index === 2) return [];
  const count = index === 4 ? 16 : 2 + ((index * 5) % 7);
  return Array.from({ length: count }, (_, k) => {
    const template = TEMPLATES[(index * 3 + k) % TEMPLATES.length];
    const state = index === 4 && k === 14 ? "rejected" : (STATES[(index + k) % STATES.length] ?? "confirmed");
    return { title: template?.title ?? "Finding", severity: template?.severity ?? null, place: template?.place ?? { file: "src/index.ts", line: 1 }, state };
  });
}

function reportFor(scan: ScanStatus, findings: readonly Finding[]) {
  const confirmed = findings.filter((f) => f.state === "confirmed");
  const lines = [
    `# Security report: ${scan.repo.replace("https://github.com/", "")}`,
    "",
    `Skill: ${scan.skill}${scan.skill === "full" ? ` (${scan.profile})` : ""}   Model: ${scan.model}   Effort: ${scan.effort}`,
    "",
    "## Summary",
    "",
    `${findings.length} findings were recorded. ${confirmed.length} are confirmed and ${findings.filter((f) => f.state === "needs_validation").length} need validation.`,
    "",
    "## Findings",
  ];
  findings.forEach((finding, k) => {
    lines.push(
      "",
      `### ${k + 1}. ${finding.title}`,
      "",
      `Severity: ${finding.severity ?? "unrated"}   State: ${finding.state.replace("_", " ")}`,
      `Location: ${finding.place ? `${finding.place.file}:${finding.place.line}` : "unknown"}`,
      "",
      "The affected code path accepts input that reaches a sensitive operation without validation. An attacker who controls that input can change the behaviour of the call. Review the surrounding handler and add an explicit check before the call.",
    );
  });
  lines.push("", "## Method", "", "Static review of the default branch, followed by a targeted pass over every route that handles untrusted input.");
  return lines.join("\n");
}

function filesFor(scan: ScanStatus, findings: readonly Finding[]): ScanPrototypeFile[] {
  if (!scan.files) return [];
  const files = [
    { name: "REPORT.md", content: reportFor(scan, findings) },
    { name: "findings.json", content: JSON.stringify(findings, null, 2) },
  ];
  if (scan.files.includes("threat-model.md")) {
    files.push({
      name: "threat-model.md",
      content: "# Threat model\n\nActors: anonymous visitor, signed-in member, workspace admin.\nAssets: session tokens, uploaded files, billing records.\nEntry points: HTTP routes, webhooks, background jobs.\n",
    });
  }
  return files;
}

export function buildScanPrototype(now: number): ScanPrototypeEntry[] {
  return Array.from({ length: SCAN_COUNT }, (_, index) => {
    const scan = scanFor(index, now);
    const findings = findingsFor(scan, index);
    return { scan, findings, files: filesFor(scan, findings) };
  });
}

export function buildOverviewPrototype(entries: readonly ScanPrototypeEntry[]): Overview {
  const byState = { queued: 0, running: 0, succeeded: 0, failed: 0 };
  for (const { scan } of entries) byState[scan.status] += 1;

  const sampled = entries.filter((entry) => entry.scan.status === "succeeded" && entry.scan.files?.includes("findings.json")).slice(0, OVERVIEW_SAMPLE);
  const severity = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  let needsValidation = 0;
  for (const finding of sampled.flatMap((entry) => entry.findings)) {
    if (finding.state === "needs_validation") needsValidation += 1;
    if (finding.state === "confirmed" && finding.severity) severity[finding.severity] += 1;
  }
  return { total: entries.length, hasMore: false, byState, severity, needsValidation, repos: 1 };
}

const DEMO_BUDGET_USD = 20;
const DEMO_RESERVED_PER_RUNNING_SCAN_USD = 1;

// -----
// The budget card reads the usage query. The demo has no engine, so the demo
// spend is the sum of the demo scans' own reports, and each running scan holds a
// dollar, so the "held by running scans" line has something to show.
// -----
export function buildUsagePrototype(entries: readonly ScanPrototypeEntry[], now: number): Usage {
  const spentUsd = entries.reduce((sum, { scan }) => sum + (scan.usage?.costUsd ?? 0), 0);
  const running = entries.filter(({ scan }) => scan.status === "running" || scan.status === "queued").length;
  const reservedUsd = running * DEMO_RESERVED_PER_RUNNING_SCAN_USD;
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const { scan } of entries) {
    tokens.input += scan.usage?.inputTokens ?? 0;
    tokens.output += scan.usage?.outputTokens ?? 0;
    tokens.cacheRead += scan.usage?.cacheReadTokens ?? 0;
    tokens.cacheWrite += scan.usage?.cacheWriteTokens ?? 0;
  }
  return { month: new Date(now).toISOString().slice(0, 7), budgetUsd: DEMO_BUDGET_USD, spentUsd, reservedUsd, remainingUsd: DEMO_BUDGET_USD - spentUsd - reservedUsd, scans: entries.length, tokens };
}
