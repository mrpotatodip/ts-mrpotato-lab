import { describeRoute } from "hono-openapi";
import { GithubBranchesSchema, GithubConnectSchema, GithubInstallationSchema, GithubInstallationsSchema, GithubReposSchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const SESSION = '  -H "authorization: Bearer $SESSION_TOKEN" \\';
const AUTH = `  -H "authorization: Bearer $SCAN_API_TOKEN" \\`;
const ACCOUNT = `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`;
const INSTALLATION_EXAMPLE = `{ "id": "3f1c2a4e-9d3b-4f60-8a71-2b3c4d5e6f70", "installationId": 180358836, "accountLogin": "octocat", "repositorySelection": "selected", "status": "active", "connectedAt": "2026-11-10T09:00:00.000Z", "checkedAt": "2026-11-10T09:00:00.000Z" }`;

export const connectGithubDoc = describeRoute({
  tags: ["github"],
  security: SERVICE_SECURITY,
  summary: "Start connecting GitHub",
  description: routeText({
    context: "An account admin connects the EliseLAB GitHub App to read private repos. This gives the address to send the browser to.",
    steps: [
      "The Worker checks the session and that the login is `tenant_admin` in the account.",
      "The Worker asks GitHub for the App's name, so the address needs no extra setting.",
      "The Worker signs a state that names the account and the admin, good for 10 minutes.",
      "The Worker returns the install address with the state in it.",
    ],
    example: [
      "Start the install:",
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/github/connect \\`, SESSION, ACCOUNT),
      json(`{ "data": { "url": "https://github.com/apps/elise/installations/new?state=eyJhY2..." }, "error": null }`),
    ],
  }),
  responses: { 200: jsonResponse("Where to send the browser.", envelope(GithubConnectSchema)), ...errorResponses(400, 401, 403) },
});

export const createGithubInstallationDoc = describeRoute({
  tags: ["github"],
  security: SERVICE_SECURITY,
  summary: "Finish connecting GitHub",
  description: routeText({
    context:
      "GitHub sends the browser back with the install, a one-time code and our state. The dashboard passes them here with the notice checkbox. The number in the address proves nothing, so the Worker asks GitHub whether the person behind the code can use that install.",
    steps: [
      "The Worker checks the session and that the login is `tenant_admin` in the account.",
      "The Worker checks that the state is its own, unexpired, and made for this admin and account. If not, the answer is 403.",
      "The Worker trades the code for a short-lived token that acts as the person, asks GitHub which installs that person can use, and drops the token. If the install is not among them, the answer is 403.",
      "The Worker reads the install from GitHub: its account, the repos it covers, and whether it is suspended.",
      "The Worker saves the install and writes an audit row with the time the notice was accepted. An install already held by another account is refused with 409. The same account connecting it again refreshes the row.",
    ],
    example: [
      "Finish the install:",
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/github/installations \\`, SESSION, ACCOUNT + " \\", '  -H "Content-Type: application/json" \\', `  -d '{"installationId":180358836,"code":"a1b2c3","state":"eyJhY2...","noticeAccepted":true}'`),
      json(`{ "data": ${INSTALLATION_EXAMPLE}, "error": null }`),
    ],
  }),
  responses: {
    201: jsonResponse("The connected install.", envelope(GithubInstallationSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});

export const listGithubInstallationsDoc = describeRoute({
  tags: ["github"],
  security: SERVICE_SECURITY,
  summary: "List the connected GitHub installs",
  description: routeText({
    context: "The dashboard shows who the account is connected as, and where to manage each install on GitHub. The Worker keeps no webhook, so it asks GitHub again when a check is old.",
    steps: [
      "The Worker reads the installs of the account, oldest first.",
      "For each install that is not removed and was last checked more than five minutes ago, the Worker asks GitHub about it. An install GitHub no longer has becomes `removed`, a suspended one `suspended`. If GitHub cannot answer, the status stays as it was.",
      "A removed install keeps its row, so old scans keep their link. `manageUrl` is where GitHub manages the install, or null for an install not yet checked.",
    ],
    example: ["List the installs:", bash(`curl ${EXAMPLE_BASE_URL}/github/installations \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The installs.", envelope(GithubInstallationsSchema)), ...errorResponses(400, 401, 403) },
});

export const disconnectGithubInstallationDoc = describeRoute({
  tags: ["github"],
  security: SERVICE_SECURITY,
  summary: "Disconnect a GitHub install",
  description: routeText({
    context:
      "An account admin stops EliseLAB using an install. This cannot take access away on GitHub: only an uninstall there does that. Past scans and reports stay.",
    steps: [
      "The Worker checks the session and that the login is `tenant_admin` in the account.",
      "The Worker marks the install `removed` and writes an audit row. An install of another account answers 404. Disconnecting twice is harmless.",
      "From then on no scan of the account signs with this install, and its repos leave the picker. Connecting it again makes it active.",
    ],
    example: ["Disconnect an install:", bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/github/installations/3f1c2a4e-9d3b-4f60-8a71-2b3c4d5e6f70 \\`, SESSION, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The install, now removed.", envelope(GithubInstallationSchema)), ...errorResponses(400, 401, 403, 404) },
});

export const listGithubBranchesDoc = describeRoute({
  tags: ["github"],
  security: SERVICE_SECURITY,
  summary: "List the branches of a connected repository",
  description: routeText({
    context: "The scan form's branch dropdown for a private repository: the default branch first, then the others. A branch becomes tracked only after a scan of it succeeds, so listing one tracks nothing.",
    steps: [
      "The Worker looks the install up among the account's own active installs. An install of another account, or one that is removed, answers 404.",
      "The Worker makes a one-hour token limited to that repo and asks GitHub for the repo and its first 100 branches. A repo the install cannot see answers 404.",
      "The Worker returns the default branch first. `truncated` is true when GitHub has more than one page: the rest are reached by typing the exact name in the scan.",
    ],
    example: [
      "List the branches:",
      bash(`curl "${EXAMPLE_BASE_URL}/github/branches?installationId=3f1c2a4e-9d3b-4f60-8a71-2b3c4d5e6f70&repo=octocat/hello" \\`, AUTH, ACCOUNT),
      json(`{ "data": { "defaultBranch": "main", "branches": ["main", "develop"], "truncated": false }, "error": null }`),
    ],
  }),
  responses: { 200: jsonResponse("The branches.", envelope(GithubBranchesSchema)), ...errorResponses(400, 401, 403, 404) },
});

export const listGithubReposDoc = describeRoute({
  tags: ["github"],
  security: SERVICE_SECURITY,
  summary: "List the repos the connected installs can read",
  description: routeText({
    context: "The repo picker. It shows what EliseLAB can read, so people do not have to type a URL.",
    steps: [
      "The Worker reads the account's active installs.",
      "For each it makes a short-lived token and asks GitHub for the first 100 repos. An install GitHub will not answer for is left out, and the rest still show.",
      "The Worker returns the repos sorted by name, each with the install it came from and whether it is private.",
    ],
    example: ["List the repos:", bash(`curl ${EXAMPLE_BASE_URL}/github/repos \\`, AUTH, ACCOUNT)],
  }),
  responses: { 200: jsonResponse("The repos.", envelope(GithubReposSchema)), ...errorResponses(400, 401, 403) },
});
