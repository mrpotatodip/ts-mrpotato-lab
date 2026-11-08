import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LiteFindingsSchema, RecheckSchema } from "#/modules/scan-records/schemas";

const SCRIPT = resolve(__dirname, "../../../../skills/security-audit-lite/validate-output.cjs");

type Input = { findings: unknown; recheck: unknown; priors: { priorId: string }[] };
// SAFETY: validate-output.cjs exports exactly this function; it is plain JavaScript with no types.
const { validateOutput } = createRequire(import.meta.url)(SCRIPT) as { validateOutput: (input: Input) => string[] };

const finding = (id: string, extra: Record<string, string | null | { file: string }[]> = {}) => ({
  id,
  status: "confirmed",
  severity: "high",
  title: `t-${id}`,
  class: "authz",
  location: [{ file: "src/a.ts" }],
  ...extra,
});

describe("validate-output.cjs", () => {
  it("accepts a first scan with no priors and no recheck.json", () => {
    expect(validateOutput({ findings: [finding("F-001")], recheck: undefined, priors: [] })).toEqual([]);
  });

  it("accepts every prior answered once: kept with its priorId, or listed in recheck.json", () => {
    const errors = validateOutput({
      findings: [finding("F-001", { priorId: "p1" })],
      recheck: [{ priorId: "p2", result: "not_found" }, { priorId: "p3", result: "cannot_tell" }],
      priors: [{ priorId: "p1" }, { priorId: "p2" }, { priorId: "p3" }],
    });

    expect(errors).toEqual([]);
  });

  it("names a prior nobody answered", () => {
    const errors = validateOutput({ findings: [], recheck: [], priors: [{ priorId: "p1" }] });

    expect(errors).toEqual(["prior p1 has no answer: keep it in findings.json with its priorId, or list it in recheck.json"]);
  });

  it("refuses a prior both kept and listed, an unknown priorId and a repeated one", () => {
    const errors = validateOutput({
      findings: [finding("F-001", { priorId: "p1" }), finding("F-002", { priorId: "p1" }), finding("F-003", { priorId: "nope" })],
      recheck: [{ priorId: "p1", result: "not_found" }, { priorId: "p1", result: "not_found" }],
      priors: [{ priorId: "p1" }],
    });

    expect(errors.join("\n")).toContain("priorId p1 is used twice");
    expect(errors.join("\n")).toContain("priorId nope is not in prior-findings.json");
    expect(errors.join("\n")).toContain("priorId p1 is also kept in findings.json");
    expect(errors.join("\n")).toContain("priorId p1 is listed twice");
  });

  it("refuses a priorId when no priors were given, and a missing recheck.json when they were", () => {
    expect(validateOutput({ findings: [finding("F-001", { priorId: "p1" })], recheck: undefined, priors: [] })[0]).toContain("no prior-findings.json was given");
    expect(validateOutput({ findings: [], recheck: undefined, priors: [{ priorId: "p1" }] })).toEqual(["recheck.json must exist and be a JSON array when prior-findings.json is given"]);
  });

  it("holds findings to the shape the Worker reads", () => {
    const errors = validateOutput({
      findings: [finding("F-001", { severity: null }), finding("F-001"), { id: "F-009" }, finding("F-002", { status: "needs_validation", severity: "low" })],
      recheck: undefined,
      priors: [],
    });
    const text = errors.join("\n");

    expect(text).toContain("a confirmed finding needs a severity");
    expect(text).toContain("id F-001 is used twice");
    expect(text).toContain("status must be one of confirmed, needs_validation");
    expect(text).toContain("a needs_validation finding has severity null");
  });

  it("agrees with the Zod schemas the Worker parses the same files with", () => {
    const findings = [finding("F-001", { priorId: "p1" }), finding("F-002")];
    const recheck = [{ priorId: "p2", result: "not_found" }];

    expect(validateOutput({ findings, recheck, priors: [{ priorId: "p1" }, { priorId: "p2" }] })).toEqual([]);
    expect(LiteFindingsSchema.safeParse(findings).success).toBe(true);
    expect(RecheckSchema.safeParse(recheck).success).toBe(true);
    expect(RecheckSchema.safeParse([{ priorId: "p2", result: "gone" }]).success).toBe(false);
    expect(validateOutput({ findings: [], recheck: [{ priorId: "p2", result: "gone" }], priors: [{ priorId: "p2" }] }).join("\n")).toContain("result must be one of");
  });

  it("runs from the command line: ok and exit 0, or one line per problem and exit 1", () => {
    const dir = mkdtempSync(join(tmpdir(), "validate-output-"));
    const priors = join(dir, "prior-findings.json");
    writeFileSync(priors, JSON.stringify([{ priorId: "p1" }]));
    writeFileSync(join(dir, "findings.json"), JSON.stringify([finding("F-001")]));

    const missing = spawnSync("node", [SCRIPT, dir, priors], { encoding: "utf8" });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("recheck.json is missing");

    writeFileSync(join(dir, "recheck.json"), JSON.stringify([{ priorId: "p1", result: "not_found" }]));
    const fine = spawnSync("node", [SCRIPT, dir, priors], { encoding: "utf8" });
    expect(fine.status).toBe(0);
    expect(fine.stdout.trim()).toBe("ok");

    writeFileSync(join(dir, "findings.json"), "{ not json");
    expect(spawnSync("node", [SCRIPT, dir], { encoding: "utf8" }).stderr).toContain("findings.json is not valid JSON");
  });
});
