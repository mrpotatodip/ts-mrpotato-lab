import { SCAN_MODEL_OPTIONS, SCAN_PROFILE_OPTIONS, SCAN_SKILL_OPTIONS } from "../constants";
import { CreateScanInputSchema, type CreateScanInput } from "../schemas";
import { scanRepoName } from "./scan-repo-name";

const labelOf = (options: readonly { value: string; label: string }[], value: string) => options.find((option) => option.value === value)?.label ?? value;

export function scanPlanSummary(input: CreateScanInput) {
  if (!CreateScanInputSchema.safeParse(input).success) return null;
  const { owner, name } = scanRepoName(input.repo, input.repo);
  const skill = labelOf(SCAN_SKILL_OPTIONS, input.skill).toLowerCase();
  const coverage = input.skill === "full" ? `, ${labelOf(SCAN_PROFILE_OPTIONS, input.profile).toLowerCase()} coverage,` : "";
  const model = labelOf(SCAN_MODEL_OPTIONS, input.model);
  return `You're about to run a ${skill}${coverage} on ${owner}/${name}${input.ref ? ` (branch ${input.ref})` : ""} with ${model}. You'll land on the report page, where progress updates on its own.`;
}
