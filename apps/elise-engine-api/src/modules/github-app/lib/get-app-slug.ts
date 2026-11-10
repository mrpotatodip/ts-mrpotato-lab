import { z } from "zod";
import { GITHUB_API_URL } from "#/modules/github-app/constants";
import type { GithubAppConfig, GithubFetch } from "#/modules/github-app/types";
import { createAppJwt } from "#/modules/github-app/utils";
import { githubHeaders } from "./mint-repo-token";

const AppSchema = z.looseObject({ slug: z.string().min(1) });

// -----
// The name GitHub uses in the App's install address. The App says it
// itself, so no extra setting has to match.
// -----
export const getAppSlug = async (config: GithubAppConfig, fetchImpl: GithubFetch = fetch): Promise<string> => {
  const response = await fetchImpl(`${GITHUB_API_URL}/app`, { headers: githubHeaders(await createAppJwt(config)) });
  if (response.status !== 200) throw new Error(`GitHub did not describe the App: ${response.status}`);
  const body = AppSchema.safeParse(await response.json());
  if (!body.success) throw new Error("GitHub sent no App slug");
  return body.data.slug;
};
