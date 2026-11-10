import { SEVERITIES, type Finding } from "../schemas";

const section = (heading: string, title: string, body: string | null | undefined) => (body ? [`${heading} ${title}`, body.trim(), ""] : []);

const CHECK_FIRST = "Check the code first: the finding may be out of date. Make the smallest change that removes the problem, then run the project's tests.";

const RANK = new Map<string | null, number>([...SEVERITIES.map((s, i) => [s, i] as const), [null, SEVERITIES.length]]);

function findingLines(finding: Finding, level: "#" | "##", headingLevel: "##" | "###") {
  const { detail, place, severity } = finding;
  const where = place ? `${place.file}:${place.line}` : "No file was recorded; locate it from the evidence.";
  return [
    `${level} ${finding.title}`,
    "",
    `Severity: ${severity ?? "not rated"}`,
    finding.state === "needs_validation" ? "Status: not confirmed yet. Verify it is real before changing code." : null,
    detail?.class ? `Type: ${detail.class}` : null,
    `Location: ${where}`,
    "",
    ...section(headingLevel, "What could happen", detail?.impact),
    ...section(headingLevel, "Evidence in the code", detail?.evidence),
    ...section(headingLevel, "Suggested fix", detail?.fix),
  ];
}

const joined = (lines: readonly (string | null)[]) => lines.filter((line): line is string => line !== null).join("\n");

// -----
// A finding written as a task another coding agent can act on without this
// dashboard: where it is, what is wrong, the evidence and the suggested fix.
// -----
export function scanFindingPrompt(finding: Finding): string {
  return joined([`Fix this security finding from an EliseLAB audit.`, "", ...findingLines(finding, "#", "##"), CHECK_FIRST]);
}

type ScanFindingsPromptContext = { repo?: string; commit?: string };

// -----
// Every finding the scan stands behind, most severe first. A finding the
// review rejected is left out: it is a false positive, not work to do.
// -----
export function scanFindingsPrompt(findings: readonly Finding[], context: ScanFindingsPromptContext = {}): string {
  const todo = findings.filter((finding) => finding.state !== "rejected").toSorted((a, b) => (RANK.get(a.severity) ?? 0) - (RANK.get(b.severity) ?? 0));
  const target = context.repo ? ` in ${context.repo}${context.commit ? ` at commit ${context.commit.slice(0, 7)}` : ""}` : "";
  return joined([
    `Fix these ${todo.length} security findings from an EliseLAB audit${target}, most severe first.`,
    "",
    ...todo.flatMap((finding) => [...findingLines(finding, "##", "###"), "---", ""]),
    `${CHECK_FIRST} Work through them in order and keep each fix separate.`,
  ]);
}
