import { z } from "zod";
import { GITHUB_API_URL, GITHUB_BRANCHES_PER_PAGE } from "#/modules/github-app/constants";
import type { GithubAppConfig, GithubFetch, GithubRepoBranches } from "#/modules/github-app/types";
import { GithubHttpError } from "./github-http-error";
import { githubHeaders, mintRepoTokenByName } from "./mint-repo-token";

const RepoSchema = z.looseObject({ default_branch: z.string().min(1) });
const BranchesSchema = z.array(z.looseObject({ name: z.string().min(1) }));

const NOT_VISIBLE = new Set([404, 422]);

// -----
// The default branch and the first page of branches of a repo the install
// covers, the default first so a picker can open on it. truncated says
// GitHub has more than one page: the rest are reached by typing the name.
// Null: the install cannot see the repo. GitHub says 404 when the repo is
// gone, and 422 when the token cannot be limited to a repo it does not cover.
// -----
export const getRepoBranches = async (
  config: GithubAppConfig,
  installationId: number,
  owner: string,
  name: string,
  fetchImpl: GithubFetch = fetch,
): Promise<GithubRepoBranches | null> => {
  let token: string;
  try {
    token = await mintRepoTokenByName(config, installationId, name, fetchImpl);
  } catch (error) {
    if (error instanceof GithubHttpError && NOT_VISIBLE.has(error.status)) return null;
    throw error;
  }

  const base = `${GITHUB_API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const headers = githubHeaders(token);
  const [repo, branches] = await Promise.all([fetchImpl(base, { headers }), fetchImpl(`${base}/branches?per_page=${GITHUB_BRANCHES_PER_PAGE}`, { headers })]);
  if (repo.status === 404) return null;
  if (repo.status !== 200) throw new GithubHttpError(`GitHub could not read the repo: ${repo.status}`, repo.status);
  if (branches.status !== 200) throw new GithubHttpError(`GitHub could not list the branches: ${branches.status}`, branches.status);

  const repoBody = RepoSchema.safeParse(await repo.json());
  const branchesBody = BranchesSchema.safeParse(await branches.json());
  if (!repoBody.success) throw new Error("GitHub sent no default branch");
  if (!branchesBody.success) throw new Error("GitHub sent no branch list");

  const defaultBranch = repoBody.data.default_branch;
  const others = branchesBody.data.map((branch) => branch.name).filter((branch) => branch !== defaultBranch);
  return { defaultBranch, branches: [defaultBranch, ...others], truncated: branches.headers.get("link")?.includes('rel="next"') === true };
};
