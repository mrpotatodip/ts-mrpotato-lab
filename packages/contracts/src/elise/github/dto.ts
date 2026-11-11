import { z } from "zod";

export const GITHUB_INSTALLATION_STATUS_VALUES = ["active", "suspended", "removed"] as const;
export const GITHUB_REPOSITORY_SELECTION_VALUES = ["all", "selected"] as const;

export const GithubInstallationStatusSchema = z.enum(GITHUB_INSTALLATION_STATUS_VALUES);
export const GithubRepositorySelectionSchema = z.enum(GITHUB_REPOSITORY_SELECTION_VALUES);

// -----
// Where to send the browser to install the App. The url carries a
// signed state that names the account and the admin who asked.
// -----
export const GithubConnectSchema = z.object({ url: z.url() });

// -----
// What GitHub gives the dashboard when the install ends: the install,
// the one-time code, and the state sent out. noticeAccepted is the
// checkbox that says code excerpts go to Anthropic: it must be true.
// -----
export const ConnectGithubBodySchema = z.object({
  installationId: z.number().int().positive(),
  code: z.string().trim().min(1).max(200),
  state: z.string().trim().min(1).max(1000),
  noticeAccepted: z.literal(true),
});

export const GithubInstallationSchema = z.object({
  id: z.uuid(),
  installationId: z.number().int(),
  accountLogin: z.string(),
  repositorySelection: GithubRepositorySelectionSchema,
  status: GithubInstallationStatusSchema,
  connectedAt: z.iso.datetime(),
  checkedAt: z.iso.datetime().nullable(),
  manageUrl: z.url().nullable().optional(),
});

export const GithubInstallationsSchema = z.array(GithubInstallationSchema);

export const GithubInstallationParamSchema = z.object({ id: z.uuid() });

// -----
// A repo an install of the account can read. installationId is the
// install's row (GithubInstallation.id), not GitHub's number.
// -----
export const GithubRepoSchema = z.object({
  installationId: z.uuid(),
  fullName: z.string(),
  url: z.url(),
  private: z.boolean(),
});

export const GithubReposSchema = z.array(GithubRepoSchema);

// -----
// The branches of one repo a connection covers, for the scan form's
// dropdown. installationId is the install's row, repo is owner/name.
// -----
export const GithubBranchesQuerySchema = z.object({
  installationId: z.uuid(),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
});

// -----
// The default branch comes first. truncated says GitHub has more than the
// first page, so the rest are reached by typing the exact name.
// -----
export const GithubBranchesSchema = z.object({
  defaultBranch: z.string(),
  branches: z.array(z.string()),
  truncated: z.boolean(),
});

export type GithubInstallationStatus = z.infer<typeof GithubInstallationStatusSchema>;
export type GithubConnect = z.infer<typeof GithubConnectSchema>;
export type ConnectGithubBody = z.infer<typeof ConnectGithubBodySchema>;
export type GithubInstallation = z.infer<typeof GithubInstallationSchema>;
export type GithubRepo = z.infer<typeof GithubRepoSchema>;
export type GithubBranches = z.infer<typeof GithubBranchesSchema>;
export type GithubBranchesQuery = z.infer<typeof GithubBranchesQuerySchema>;
