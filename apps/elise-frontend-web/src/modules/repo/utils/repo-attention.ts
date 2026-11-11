import { SEVERITIES, type SeverityCounts } from "#/modules/scan";
import type { Repo } from "../schemas";

const WEIGHT = { critical: 10_000, high: 1_000, medium: 100, low: 10, informational: 1 } satisfies Record<(typeof SEVERITIES)[number], number>;

export const repoAttention = (repo: Pick<Repo, "open">) =>
  repo.open.regressed * 100_000 + SEVERITIES.reduce((sum, s) => sum + repo.open.severity[s] * WEIGHT[s], 0) + repo.open.needsValidation;

export const rankRepos = (repos: readonly Repo[]): Repo[] =>
  repos.toSorted((a, b) => repoAttention(b) - repoAttention(a) || b.open.total - a.open.total || (b.lastScanAt ?? "").localeCompare(a.lastScanAt ?? ""));

export function repoTotals(repos: readonly Repo[]) {
  const severity: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  let total = 0;
  let regressed = 0;
  let needsValidation = 0;
  let unchecked = 0;
  for (const repo of repos) {
    total += repo.open.total;
    regressed += repo.open.regressed;
    needsValidation += repo.open.needsValidation;
    unchecked += repo.open.unchecked;
    for (const s of SEVERITIES) severity[s] += repo.open.severity[s];
  }
  return { total, regressed, needsValidation, unchecked, severity };
}
