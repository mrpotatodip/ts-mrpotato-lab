import { describe, expect, it } from "vitest";
import type { FindingTriageStatusValue } from "@repo/contracts/elise";
import { LiteFindingSchema, type LiteFinding } from "#/modules/scan-records/schemas";
import type { HistoryRow, PriorFinding } from "#/modules/scan-records/types";
import { planHistory } from "#/modules/scan-records/utils";

const REPO = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
const BRANCH = "7c2d1e90-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const TENANT = "0b8c1d2e-3f4a-4b5c-8d6e-7f8091a2b3c4";
const fp = (letter: string) => letter.repeat(64);

const found = (id: string, letter: string, extra: Partial<LiteFinding> = {}) => ({
  finding: LiteFindingSchema.parse({ id, status: "confirmed", severity: "high", title: `t-${letter}`, class: "authz", location: [{ file: "src/a.ts", line: 1 }], ...extra }),
  fingerprint: fp(letter),
});

const row = (letter: string, extra: Partial<HistoryRow> = {}): HistoryRow => ({
  repoId: REPO,
  branchId: BRANCH,
  tenantId: TENANT,
  fingerprint: fp(letter),
  state: "open",
  unchecked: false,
  firstSeenScanId: "scan-1",
  lastSeenScanId: "scan-1",
  fixedInScanId: null,
  possibleDuplicateOf: null,
  updatedAt: new Date(),
  ...extra,
});

const prior = (letter: string, extra: Partial<PriorFinding> = {}): PriorFinding => ({
  priorId: fp(letter),
  status: "confirmed",
  severity: "high",
  title: `t-${letter}`,
  class: "authz",
  file: "src/a.ts",
  line: 1,
  ...extra,
});

const plan = (input: {
  history?: HistoryRow[];
  triage?: [string, FindingTriageStatusValue][];
  given?: PriorFinding[];
  found?: ReturnType<typeof found>[];
  recheck?: { priorId: string; result: "not_found" | "cannot_tell" }[];
}) =>
  planHistory({
    scanId: "scan-2",
    repoId: REPO,
    branchId: BRANCH,
    tenantId: TENANT,
    history: new Map((input.history ?? []).map((entry) => [entry.fingerprint, entry])),
    triage: new Map((input.triage ?? []).map(([letter, status]) => [fp(letter), status])),
    given: input.given ?? [],
    found: input.found ?? [],
    recheck: input.recheck ?? [],
  });

const historyOf = (result: ReturnType<typeof plan>, letter: string) => result.history.find((entry) => entry.fingerprint === fp(letter));

describe("planHistory", () => {
  it("starts the history of a problem seen for the first time", () => {
    const result = plan({ found: [found("F-001", "a")] });

    expect(result.findings).toMatchObject([{ fingerprint: fp("a"), origin: "new" }]);
    expect(historyOf(result, "a")).toMatchObject({ state: "open", unchecked: false, firstSeenScanId: "scan-2", lastSeenScanId: "scan-2" });
  });

  it("carries a prior the agent still sees, under the prior's fingerprint even if its title changed", () => {
    const result = plan({
      history: [row("a")],
      given: [prior("a")],
      found: [found("F-001", "z", { priorId: fp("a"), title: "reworded title" })],
    });

    expect(result.findings).toMatchObject([{ fingerprint: fp("a"), origin: "carried" }]);
    expect(result.history).toHaveLength(1);
    expect(historyOf(result, "a")).toMatchObject({ state: "open", firstSeenScanId: "scan-1", lastSeenScanId: "scan-2" });
  });

  it("ignores a priorId the agent was never given", () => {
    const result = plan({ found: [found("F-001", "b", { priorId: fp("q") })] });

    expect(result.findings).toMatchObject([{ fingerprint: fp("b"), origin: "new" }]);
  });

  it("closes a prior only when the agent says it is gone and nothing looks like it", () => {
    const result = plan({ history: [row("a")], given: [prior("a")], recheck: [{ priorId: fp("a"), result: "not_found" }] });

    expect(historyOf(result, "a")).toMatchObject({ state: "fixed_by_code", fixedInScanId: "scan-2", unchecked: false });
  });

  it("never closes on silence or on cannot_tell: the prior stays open and unchecked", () => {
    const silent = plan({ history: [row("a")], given: [prior("a")] });
    const unsure = plan({ history: [row("a")], given: [prior("a")], recheck: [{ priorId: fp("a"), result: "cannot_tell" }] });

    for (const result of [silent, unsure]) {
      expect(historyOf(result, "a")).toMatchObject({ state: "open", unchecked: true, fixedInScanId: null, lastSeenScanId: "scan-1" });
    }
  });

  it("does not touch priors it was not asked about", () => {
    const result = plan({ history: [row("a"), row("b")], given: [prior("a")], recheck: [{ priorId: fp("a"), result: "not_found" }] });

    expect(historyOf(result, "b")).toBeUndefined();
  });

  it("keeps a prior open and flags the lookalike when a new finding shares its class and file", () => {
    const result = plan({
      history: [row("a")],
      given: [prior("a")],
      found: [found("F-001", "b", { title: "same problem, other words" })],
      recheck: [{ priorId: fp("a"), result: "not_found" }],
    });

    expect(historyOf(result, "a")).toMatchObject({ state: "open", unchecked: true });
    expect(historyOf(result, "b")).toMatchObject({ possibleDuplicateOf: fp("a") });
  });

  it("does not call a different file a lookalike", () => {
    const result = plan({
      history: [row("a")],
      given: [prior("a")],
      found: [found("F-001", "b", { location: [{ file: "src/other.ts", line: 3 }] })],
      recheck: [{ priorId: fp("a"), result: "not_found" }],
    });

    expect(historyOf(result, "a")).toMatchObject({ state: "fixed_by_code" });
    expect(historyOf(result, "b")?.possibleDuplicateOf).toBeNull();
  });

  it("marks a problem that was fixed by code and is found again as regressed", () => {
    const result = plan({ history: [row("a", { state: "fixed_by_code", fixedInScanId: "scan-1" })], found: [found("F-001", "a")] });

    expect(historyOf(result, "a")).toMatchObject({ state: "regressed", lastSeenScanId: "scan-2", fixedInScanId: "scan-1" });
  });

  it("marks a problem a person called fixed and the scan finds again as regressed", () => {
    const result = plan({ history: [row("a")], triage: [["a", "fixed"]], found: [found("F-001", "a")] });

    expect(historyOf(result, "a")?.state).toBe("regressed");
  });

  it("leaves a false positive that is found again as it was, so its decision still holds", () => {
    const result = plan({ history: [row("a")], triage: [["a", "false_positive"]], found: [found("F-001", "a")] });

    expect(historyOf(result, "a")?.state).toBe("open");
  });

  it("keeps a regression flagged while the problem is still there", () => {
    const result = plan({ history: [row("a", { state: "regressed" })], given: [prior("a")], found: [found("F-001", "a", { priorId: fp("a") })] });

    expect(historyOf(result, "a")?.state).toBe("regressed");
  });

  it("lists one problem once when the agent reports it twice", () => {
    const result = plan({ found: [found("F-001", "a"), found("F-002", "a")] });

    expect(result.findings).toHaveLength(1);
    expect(result.history).toHaveLength(1);
  });

  it("counts how the agent answered for the priors it was given", () => {
    const result = plan({
      history: [row("a"), row("b"), row("c"), row("d")],
      given: [prior("a"), prior("b", { file: "src/b.ts" }), prior("c", { file: "src/c.ts" }), prior("d", { file: "src/d.ts" })],
      found: [found("F-001", "a", { priorId: fp("a") })],
      recheck: [{ priorId: fp("b"), result: "not_found" }, { priorId: fp("c"), result: "cannot_tell" }],
    });

    expect(result.tally).toEqual({ given: 4, carried: 1, closed: 1, unchecked: 2 });
  });

  it("tallies nothing when no priors were given", () => {
    expect(plan({ found: [found("F-001", "a")] }).tally).toEqual({ given: 0, carried: 0, closed: 0, unchecked: 0 });
  });

  it("treats a finding with a prior's fingerprint as that prior, even when the agent left out the priorId", () => {
    const result = plan({ history: [row("a")], given: [prior("a")], found: [found("F-001", "a")] });

    expect(result.findings).toMatchObject([{ fingerprint: fp("a"), origin: "carried" }]);
    expect(result.tally).toEqual({ given: 1, carried: 1, closed: 0, unchecked: 0 });
  });
});
