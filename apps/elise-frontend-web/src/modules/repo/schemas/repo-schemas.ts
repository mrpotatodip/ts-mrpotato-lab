import { z } from "zod";
import { FINDING_TRIAGE_STATUS_VALUES, REPO_BRANCH_LIMIT, REPO_FINDING_STATE_VALUES, FINDING_SEVERITY_VALUES } from "@repo/contracts/elise";

export { REPO_BRANCH_LIMIT, REPO_LIMIT_PER_TENANT, RepoDetailSchema, RepoFindingListSchema, RepoListSchema, RepoParamSchema } from "@repo/contracts/elise";
export type { Repo, RepoBranch, RepoFinding } from "@repo/contracts/elise";

export const REPO_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/;
export const BRANCH_NAME_PATTERN = /^[A-Za-z0-9_][\w./-]{0,99}$/;
const COMMIT_ID = /^[0-9a-f]{40}$/i;

// -----
// The engine decides what a branch name is; this only catches the
// obvious mistakes before the request. A commit id or HEAD is not a branch.
// -----
export function branchNameError(name: string): string | null {
  if (name === "") return "Type the exact name of the branch.";
  if (COMMIT_ID.test(name)) return "That is a commit, not a branch. Scan a commit from the new scan form.";
  if (name === "HEAD") return "HEAD is not a branch name.";
  if (!BRANCH_NAME_PATTERN.test(name)) return "A branch name starts with a letter, digit or underscore, then letters, digits, . _ / or -, up to 100 characters.";
  return null;
}

const BranchNameSchema = z.string().superRefine((name, ctx) => {
  const error = branchNameError(name);
  if (error) ctx.addIssue({ code: "custom", message: error });
});

const REPO_URL_MESSAGE = "That doesn't look like a GitHub repository link. Use the form https://github.com/owner/name.";

export const AddRepoInputSchema = z.object({
  repo: z.string().regex(REPO_URL_PATTERN, REPO_URL_MESSAGE),
  branches: z.array(BranchNameSchema).max(REPO_BRANCH_LIMIT).optional(),
});

// -----
// The add dialog's fields. A branch row left empty is ignored, so it
// is the only name that is not checked.
// -----
const BranchRowSchema = z.object({
  id: z.string(),
  name: z.string().superRefine((name, ctx) => {
    const error = name === "" ? null : branchNameError(name);
    if (error) ctx.addIssue({ code: "custom", message: error });
  }),
});

export const AddRepoDetailsSchema = z.object({
  repo: z.string().trim().regex(REPO_URL_PATTERN, REPO_URL_MESSAGE),
  branches: z.array(BranchRowSchema).max(REPO_BRANCH_LIMIT),
});


export const RepoFindingsFilterSchema = z.object({
  branch: z.string().min(1).optional(),
  state: z.enum(REPO_FINDING_STATE_VALUES).optional(),
  severity: z.enum(FINDING_SEVERITY_VALUES).optional(),
  triage: z.enum(FINDING_TRIAGE_STATUS_VALUES).optional(),
});

export const RepoFindingsPageInputSchema = RepoFindingsFilterSchema.extend({
  repoId: z.uuid(),
  cursor: z.string().regex(/^\d+$/).optional(),
});

export type RepoFindingsFilter = z.infer<typeof RepoFindingsFilterSchema>;
export type RepoFindingState = (typeof REPO_FINDING_STATE_VALUES)[number];
