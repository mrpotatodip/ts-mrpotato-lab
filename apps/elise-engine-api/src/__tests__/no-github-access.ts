import { Effect } from "effect";
import type { GithubAccess } from "#/modules/github-installs";

// -----
// An Account with no GitHub install: every repo is cloned anonymously.
// -----
export const noGithubAccess = (): GithubAccess => ({ forRepo: () => Effect.succeed(null) });
