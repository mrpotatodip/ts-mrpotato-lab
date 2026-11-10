import { z } from "zod";

export {
  ConnectGithubBodySchema,
  GithubBranchesQuerySchema,
  GithubBranchesSchema,
  GithubConnectSchema,
  GithubInstallationParamSchema,
  GithubInstallationSchema,
  GithubInstallationsSchema,
  GithubReposSchema,
} from "@repo/contracts/elise";
export type { ConnectGithubBody, GithubBranches, GithubInstallation, GithubRepo } from "@repo/contracts/elise";

// -----
// What GitHub puts in the address when it sends the browser back:
// the install, a one-time code, and the state we sent out. Anything
// else (setup_action, a bad number) is ignored, and a page with a
// missing field says so instead of failing.
// -----
export const GithubCallbackSearchSchema = z.object({
  code: z.string().min(1).optional().catch(undefined),
  installation_id: z.coerce.number().int().positive().optional().catch(undefined),
  state: z.string().min(1).optional().catch(undefined),
});

export type GithubCallbackSearch = z.infer<typeof GithubCallbackSearchSchema>;
