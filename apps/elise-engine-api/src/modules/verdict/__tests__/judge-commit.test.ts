import { describe, expect, it } from "vitest";
import type { FindingSeverityValue } from "@repo/contracts/elise";
import type { JudgedFinding, JudgedScan, JudgedTriage } from "#/modules/verdict/types";
import { judgeCommit } from "#/modules/verdict/utils";

const NOW = new Date("2026-11-10T00:00:00Z");
const COMMIT = "a".repeat(40);

const scan = (id: string, day: number, overrides: Partial<JudgedScan> = {}): JudgedScan => ({
  id,
  createdAt: new Date(Date.UTC(2026, 10, day)),
  priorsGiven: 0,
  priorsUnchecked: 0,
  ...overrides,
});

const finding = (scanId: string, letter: string, severity: FindingSeverityValue | null): JudgedFinding => ({
  scanId,
  fingerprint: letter.repeat(64),
  title: `problem ${letter}`,
  severity,
  class: "authz",
  file: "src/a.ts",
  line: 1,
});

const triage = (letter: string, overrides: Partial<JudgedTriage>): JudgedTriage => ({
  fingerprint: letter.repeat(64),
  status: "open",
  note: null,
  acceptedUntil: null,
  ...overrides,
});

const twoScans = [scan("s1", 1), scan("s2", 2)];

const judge = (input: { scans?: JudgedScan[]; findings?: JudgedFinding[]; triage?: JudgedTriage[] }) =>
  judgeCommit({ commit: COMMIT, scans: input.scans ?? twoScans, findings: input.findings ?? [], triage: input.triage ?? [], now: NOW });

const codes = (verdict: ReturnType<typeof judge>) => verdict.reasons.map((reason) => reason.code);

describe("judgeCommit: enough trusted scans", () => {
  it("cannot tell when the commit was never scanned", () => {
    const verdict = judge({ scans: [] });

    expect(verdict).toMatchObject({ verdict: "cannot_tell", scans: { required: 2, counted: 0 } });
    expect(codes(verdict)).toEqual(["not_scanned"]);
    expect(verdict.basis).toBe("ai_audit");
  });

  it("cannot tell from one clean scan, because one look can miss a problem", () => {
    const verdict = judge({ scans: [scan("s1", 1)] });

    expect(verdict.verdict).toBe("cannot_tell");
    expect(verdict.reasons).toEqual([{ code: "too_few_scans", message: "1 of 2 scans of this commit; run another" }]);
  });

  it("passes after two clean scans", () => {
    expect(judge({})).toMatchObject({ verdict: "pass", reasons: [], scans: { counted: 2, ids: ["s2", "s1"] } });
  });

  it("cannot tell when one of the two newest scans left a problem unchecked", () => {
    expect(codes(judge({ scans: [scan("s1", 1), scan("s2", 2, { priorsUnchecked: 1 })] }))).toEqual(["unchecked_priors"]);
  });

  it("does not look at a scan older than the two newest", () => {
    const verdict = judge({ scans: [scan("s0", 0, { priorsUnchecked: 4 }), scan("s1", 1), scan("s2", 2)] });

    expect(verdict.verdict).toBe("pass");
  });

  it("cannot tell when the History held more open problems than a scan can check", () => {
    expect(codes(judge({ scans: [scan("s1", 1), scan("s2", 2, { priorsGiven: 50 })] }))).toEqual(["too_many_priors"]);
  });

  it("takes a scan with no counts as one that asked about nothing", () => {
    const verdict = judge({ scans: [scan("s1", 1, { priorsGiven: null, priorsUnchecked: null }), scan("s2", 2, { priorsGiven: null, priorsUnchecked: null })] });

    expect(verdict.verdict).toBe("pass");
  });
});

describe("judgeCommit: the limits", () => {
  it("fails on one critical or one high", () => {
    for (const severity of ["critical", "high"] as const) {
      const verdict = judge({ findings: [finding("s2", "a", severity)] });

      expect(verdict.verdict).toBe("fail");
      expect(verdict.reasons).toEqual([{ code: "over_limit", message: `Open: 1 ${severity}` }]);
    }
  });

  it("allows 3 medium and fails on 4", () => {
    const mediums = (count: number) => Array.from({ length: count }, (_, k) => finding("s2", String(k), "medium"));

    expect(judge({ findings: mediums(3) }).verdict).toBe("pass");
    expect(judge({ findings: mediums(4) })).toMatchObject({ verdict: "fail", counts: { medium: 4 } });
  });

  it("never fails on low or informational problems", () => {
    expect(judge({ findings: [finding("s2", "a", "low"), finding("s2", "b", "informational")] })).toMatchObject({ verdict: "pass", counts: { low: 1, informational: 1 } });
  });

  it("fails on a problem that still needs validation", () => {
    expect(judge({ findings: [finding("s2", "a", null)] })).toMatchObject({ verdict: "fail", counts: { needsValidation: 1 } });
  });

  it("still lists the findings over the limit when the scans cannot be trusted", () => {
    const verdict = judge({ scans: [scan("s1", 1)], findings: [finding("s1", "a", "critical")] });

    expect(verdict.verdict).toBe("cannot_tell");
    expect(codes(verdict)).toEqual(["too_few_scans", "over_limit"]);
  });
});

describe("judgeCommit: two scans together", () => {
  it("counts a problem that only the older scan found", () => {
    expect(judge({ findings: [finding("s1", "a", "critical")] }).verdict).toBe("fail");
  });

  it("lists a problem once, at the worst severity any scan gave it", () => {
    const verdict = judge({ findings: [finding("s1", "a", "high"), finding("s2", "a", "medium")] });

    expect(verdict.open).toHaveLength(1);
    expect(verdict.open[0].severity).toBe("high");
  });

  it("does not let an unrated look lower a rating", () => {
    const verdict = judge({ findings: [finding("s1", "a", "high"), finding("s2", "a", null)] });

    expect(verdict.open[0].severity).toBe("high");
    expect(verdict.counts).toMatchObject({ high: 1, needsValidation: 0 });
  });

  it("lists the worst problem first", () => {
    const verdict = judge({ findings: [finding("s2", "a", "low"), finding("s2", "b", "critical"), finding("s2", "c", null)] });

    expect(verdict.open.map((item) => item.severity)).toEqual(["critical", "low", null]);
  });
});

describe("judgeCommit: decisions by a person", () => {
  it("takes a false positive off the open list and shows it beside", () => {
    const verdict = judge({ findings: [finding("s2", "a", "critical")], triage: [triage("a", { status: "false_positive" })] });

    expect(verdict).toMatchObject({ verdict: "pass", open: [], dismissed: [expect.objectContaining({ title: "problem a" })] });
  });

  it("lets an accepted risk pass until its end date, and lists it with the reason", () => {
    const acceptedUntil = new Date("2026-12-01T00:00:00Z");
    const verdict = judge({ findings: [finding("s2", "a", "high")], triage: [triage("a", { status: "accepted_risk", note: "Behind the VPN", acceptedUntil })] });

    expect(verdict).toMatchObject({ verdict: "pass", open: [], accepted: [expect.objectContaining({ note: "Behind the VPN", acceptedUntil: acceptedUntil.toISOString() })] });
  });

  it("makes an expired accepted risk block again and says when it ended", () => {
    const acceptedUntil = new Date("2026-11-09T00:00:00Z");
    const verdict = judge({ findings: [finding("s2", "a", "high")], triage: [triage("a", { status: "accepted_risk", note: "x", acceptedUntil })] });

    expect(verdict.verdict).toBe("fail");
    expect(verdict.open[0].acceptanceExpiredAt).toBe(acceptedUntil.toISOString());
    expect(verdict.accepted).toEqual([]);
  });

  it("ignores a manual fixed, because a scan of this commit found the problem here", () => {
    expect(judge({ findings: [finding("s2", "a", "high")], triage: [triage("a", { status: "fixed" })] }).verdict).toBe("fail");
  });

  it("hands the impact, evidence and fix of an open problem to the caller", () => {
    const withWords: JudgedFinding = { ...finding("s2", "a", "high"), impact: "An attacker reads other accounts.", evidence: "src/a.ts:1 skips the owner check.", fix: "Check the owner.", needs: null };

    expect(judge({ findings: [withWords] }).open[0]).toMatchObject({ impact: "An attacker reads other accounts.", evidence: "src/a.ts:1 skips the owner check.", fix: "Check the owner.", needs: null });
  });

  it("applies a decision only to its own problem", () => {
    const verdict = judge({ findings: [finding("s2", "a", "high"), finding("s2", "b", "high")], triage: [triage("a", { status: "false_positive" })] });

    expect(verdict.open.map((item) => item.title)).toEqual(["problem b"]);
  });
});
