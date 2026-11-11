import { describeRoute } from "hono-openapi";
import { RepoBranchListSchema, RepoDetailSchema, RepoFindingListSchema, RepoListSchema, ScanDiffSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, EXAMPLE_SCAN_ID, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

const REPO_ID = "5d1f0c9a-2b3e-4f60-9a71-8b92c3d4e5f6";
const AUTH = `  -H "authorization: Bearer $SCAN_API_TOKEN" \\`;
const ACCOUNT = `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`;

export const listReposDoc = describeRoute({
  tags: ["repos"],
  security: SERVICE_SECURITY,
  summary: "List the repos an account scans",
  description: routeText({
    context: "Each repo has one record per account, however its URL was typed. This is the overview: how often it was scanned, its latest scan, and what is still open.",
    steps: [
      "The Worker reads the account's repos.",
      "For each it lists the names of the tracked branches (`branchNames`), counts the scans, finds the latest one, and counts the open problems by severity. Open means the history has not closed it and no person marked it fixed, a false positive or an accepted risk.",
      "`regressed` counts open problems that came back after being fixed. `unchecked` counts those the latest scan could not re-check.",
    ],
    example: ["List the repos:", bash(`curl ${EXAMPLE_BASE_URL}/repos \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The repos.", envelope(RepoListSchema)), ...errorResponses(400, 401, 403) },
});

export const getRepoDoc = describeRoute({
  tags: ["repos"],
  security: SERVICE_SECURITY,
  summary: "Show a repo and its scan history",
  description: routeText({
    context: "The history of one repo: its newest scans, each with the commit it read, its options, its cost and what it found.",
    steps: ["The Worker reads the repo, 404 if it is not in the account.", "It adds the 50 newest scans of the repo, newest first."],
    example: ["Open a repo:", bash(`curl ${EXAMPLE_BASE_URL}/repos/${REPO_ID} \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The repo and its scans.", envelope(RepoDetailSchema)), ...errorResponses(400, 401, 403, 404) },
});

export const listRepoFindingsDoc = describeRoute({
  tags: ["repos"],
  security: SERVICE_SECURITY,
  summary: "List a repo's problems across all its scans",
  description: routeText({
    context:
      "Every problem the repo has had, with where it stands: `open`, `fixed_by_code` (a scan checked and it was gone) or `regressed` (it came back). Each has the scan that first saw it and the scan that last did.",
    steps: [
      "The Worker reads the repo's history and takes the words of each problem from the scan that last saw it.",
      "It adds the decision a person made, if any (`triage`).",
      "It filters by `state`, `severity` and `triage`, and returns the worst first.",
    ],
    example: ["List what has come back:", bash(`curl "${EXAMPLE_BASE_URL}/repos/${REPO_ID}/findings?state=regressed" \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("A page of problems.", envelope(RepoFindingListSchema)), ...errorResponses(400, 401, 403, 404) },
});

export const scanDiffDoc = describeRoute({
  tags: ["scans"],
  security: SERVICE_SECURITY,
  summary: "Compare a scan with the previous one",
  description: routeText({
    context:
      "What changed in a scan against the previous succeeded lite scan of the same repo: what is new, what is still open, what came back, what was fixed and what disappeared without a check.",
    steps: [
      "The Worker finds the previous succeeded lite scan of the repo. With none, everything is new.",
      "It sorts the problems of this scan: `new`, `stillOpen` (also those the agent re-checked and still saw) and `regressed`.",
      "It sorts the previous scan's missing ones: `fixed` only if the agent checked and found them gone, else `notRechecked`.",
      "Only a succeeded lite scan can be compared; any other is a 400.",
    ],
    example: ["Compare a scan:", bash(`curl ${EXAMPLE_BASE_URL}/scans/${EXAMPLE_SCAN_ID}/diff \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The changes.", envelope(ScanDiffSchema)), ...errorResponses(400, 401, 403, 404) },
});

export const addRepoDoc = describeRoute({
  tags: ["repos"],
  security: SERVICE_SECURITY,
  summary: "Add a repo without scanning it",
  description: routeText({
    context:
      "Adds a repo and, if you name them, the branches to track. Nothing is scanned and nothing is checked on GitHub: a wrong name shows up as a failed scan. Adding a repo that is already there changes nothing except the branches you name.",
    steps: [
      "The Worker takes the repo in any spelling as one record per account, 409 past 200 repos.",
      "It tracks the branches you name, at most 25 per repo in all, 409 past that. A branch is known by its exact name.",
      "Without branches, the default branch is tracked when the first scan of the repo reads it, and any other real branch when a scan of it succeeds.",
      "Answers the repo as `GET /repos/:repoId` does.",
    ],
    example: ["Add a repo and two branches:", bash(`curl -X POST ${EXAMPLE_BASE_URL}/repos \\`, AUTH, ACCOUNT + " \\", `  -H "content-type: application/json" \\`, `  -d '${JSON.stringify({ repo: "https://github.com/octocat/Hello-World", branches: ["main", "release"] })}'`)],
  }),
  responses: { 200: jsonResponse("The repo.", envelope(RepoDetailSchema)), ...errorResponses(400, 401, 403, 409) },
});

export const addBranchDoc = describeRoute({
  tags: ["repos"],
  security: SERVICE_SECURITY,
  summary: "Track a branch of a repo",
  description: routeText({
    context:
      "Adds one branch to track, with a History of its own that starts empty. You do not have to: a successful scan of a real branch tracks it by itself. A repo tracks at most 25 branches. Adding a branch that is already tracked changes nothing. A scan of a tag or a commit is a one-off scan with no History, and it saves the reason.",
    steps: [
      "The Worker reads the repo, 404 if it is not in the account.",
      "It locks the repo, counts its branches and adds the name, 409 past the limit.",
      "Answers every branch of the repo with its open counts and the commit of its newest succeeded scan.",
    ],
    example: ["Track `release`:", bash(`curl -X POST ${EXAMPLE_BASE_URL}/repos/${REPO_ID}/branches \\`, AUTH, ACCOUNT + " \\", `  -H "content-type: application/json" \\`, `  -d '${JSON.stringify({ name: "release" })}'`)],
  }),
  responses: { 200: jsonResponse("The repo's branches.", envelope(RepoBranchListSchema)), ...errorResponses(400, 401, 403, 404, 409) },
});
