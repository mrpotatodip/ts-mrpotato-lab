import { describeRoute } from "hono-openapi";
import {
  CreatedRunnerSchema,
  EnrolledRunnerSchema,
  RunnerDisconnectedSchema,
  RunnerIdentitySchema,
  RunnerJobReportedSchema,
  RunnerJobSchema,
  RunnerRemovedSchema,
  RunnersSchema,
} from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const RUNNER_ID = "5b3f0d7e-61a4-4c2f-9d58-2f7a1c9e4b10";

export const createRunnerDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Add a Runner and get its pairing code",
  description: routeText({
    context:
      "A member of the account adds a computer that will run Scans. The answer holds a pairing code, shown once. The person types it into the EliseLAB Runner app on that computer, within 10 minutes.",
    steps: [
      "The Worker checks the session and that the login holds a Role in the account named by `x-account-id`.",
      "The Worker makes a pairing code and saves only its hash, with the name and an expiry 10 minutes away.",
      "The Worker returns the code once. It cannot be read again.",
    ],
    example: [
      "Add a Runner:",
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/runners \\`, '  -H "authorization: Bearer $SESSION_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}" \\`, '  -H "Content-Type: application/json" \\', `  -d '{"name":"Jayson MacBook"}'`),
      json(`{ "data": { "id": "${RUNNER_ID}", "name": "Jayson MacBook", "pairingCode": "K7QM-4TXD", "expiresAt": "2026-11-11T09:10:00.000Z" }, "error": null }`),
    ],
  }),
  responses: { 201: jsonResponse("The new Runner and its pairing code.", envelope(CreatedRunnerSchema)), ...errorResponses(400, 401, 403) },
});

export const enrollRunnerDoc = describeRoute({
  tags: ["runners"],
  summary: "Pair a Runner with a pairing code",
  description: routeText({
    context:
      "The Runner app trades the pairing code for a token. The token is the Runner's login from then on: the app keeps it in the computer's keychain and sends it as a bearer token. No session is needed, because the code is the proof.",
    steps: [
      "The Worker rate-limits by IP, then reads the code (any case, with or without the dash).",
      "In one UPDATE it finds a code that is unexpired, unused and not revoked, clears the code and saves the hash of a new token, so a code works once.",
      "Any code that does not match gets the same 403, whether it is wrong, expired or used.",
      "The Worker returns the token once. Only its hash is saved.",
    ],
    example: [
      "Pair:",
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/runners/enroll \\`, '  -H "Content-Type: application/json" \\', `  -d '{"code":"K7QM-4TXD"}'`),
      json(`{ "data": { "runnerId": "${RUNNER_ID}", "name": "Jayson MacBook", "accountId": "${EXAMPLE_ACCOUNT_ID}", "accountName": "Acme", "token": "elr_..." }, "error": null }`),
    ],
  }),
  responses: { 200: jsonResponse("The Runner's identity and its token.", envelope(EnrolledRunnerSchema)), ...errorResponses(400, 403) },
});

export const runnerMeDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Who is this Runner?",
  description: routeText({
    context: "A paired Runner asks who it is. A 401 means the Runner was revoked or never paired, so the app shows it as not connected. Each call also records that the Runner was seen.",
    steps: [
      "The Worker reads the bearer token and finds a Runner whose token hash matches and that is not revoked.",
      "The Worker records the time and returns the Runner's name and account.",
    ],
    example: ["Ask:", bash(`curl ${EXAMPLE_BASE_URL}/runners/me \\`, '  -H "authorization: Bearer $RUNNER_TOKEN"')],
  }),
  responses: { 200: jsonResponse("The Runner's identity.", envelope(RunnerIdentitySchema)), ...errorResponses(401) },
});

export const disconnectRunnerDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Disconnect this Runner",
  description: routeText({
    context: "A paired Runner removes itself, for example when the person presses Disconnect in the app. Its token stops working at once. Pairing again needs a new code.",
    steps: [
      "The Worker reads the bearer token and finds a Runner whose token hash matches and that is not revoked.",
      "The Worker marks the Runner revoked. If none matches, the answer is 401, so a repeat call is safe.",
    ],
    example: ["Disconnect:", bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/runners/me \\`, '  -H "authorization: Bearer $RUNNER_TOKEN"')],
  }),
  responses: { 200: jsonResponse("The Runner is disconnected.", envelope(RunnerDisconnectedSchema)), ...errorResponses(401) },
});

export const claimJobDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Claim the next Scan waiting for this Runner",
  description: routeText({
    context:
      "A paired Runner asks for work every few seconds. When a Scan was started on this Runner, the answer holds what to clone and the prompt to give the agent. With nothing waiting, `data` is null. Asking also records that the Runner is alive.",
    steps: [
      "The Worker reads the bearer token and finds the Runner. A removed or unknown one is 401.",
      "In one UPDATE the Worker takes this Runner's oldest queued Scan and marks it claimed, so a Scan is never claimed twice.",
      "The Worker returns the repository, the ref, the model options, the prompt and the earlier findings, or null.",
    ],
    example: ["Claim:", bash(`curl -X POST ${EXAMPLE_BASE_URL}/runners/claim \\`, '  -H "authorization: Bearer $RUNNER_TOKEN"')],
  }),
  responses: { 200: jsonResponse("The Scan to run, or null.", envelope(RunnerJobSchema.nullable())), ...errorResponses(401) },
});

export const reportJobDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Report the result of a Scan the Runner ran",
  description: routeText({
    context:
      "The Runner sends what its agent wrote and what git said about the clone. The Scan then moves on as if the container had finished: the files are saved, the findings recorded, the History updated. A Scan on a Runner costs EliseLAB nothing, so its cost is recorded as zero.",
    steps: [
      "The Worker reads the bearer token and finds the Runner.",
      "The Worker checks the Scan was claimed by this Runner and has not ended. A Scan that timed out is refused with 404.",
      "The Worker keeps only the file names a Scan may have. A succeeded report with no `REPORT.md` is a failure.",
      "The Worker reads the usage from the agent's own report and saves the files and the commit with the job.",
    ],
    example: [
      "Report success:",
      bash(`curl -X POST ${EXAMPLE_BASE_URL}/runners/jobs/$SCAN_ID/result \\`, '  -H "authorization: Bearer $RUNNER_TOKEN" \\', '  -H "Content-Type: application/json" \\', `  -d '{"state":"succeeded","checkout":{"commitSha":"7fd1a60b01f91b314f59955a4e4d4e80d8edf11d","headBranch":"main","kind":null},"files":{"REPORT.md":"# Report","findings.json":"{}"}}'`),
    ],
  }),
  responses: { 200: jsonResponse("The report was accepted.", envelope(RunnerJobReportedSchema)), ...errorResponses(400, 401, 404) },
});

export const listRunnersDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "List the account's Runners",
  description: routeText({
    context: "The dashboard shows each Runner of the account: waiting for its code to be used, expired, or connected, with when it was last seen. A removed Runner is not listed.",
    steps: [
      "The Worker checks the session and that the login holds a Role in the account named by `x-account-id`.",
      "The Worker reads the account's Runners that are not removed, newest first.",
      "A Runner with a token is `connected`. One with an unexpired pairing code is `waiting`. Any other is `expired`.",
    ],
    example: ["List the Runners:", bash(`curl ${EXAMPLE_BASE_URL}/runners \\`, '  -H "authorization: Bearer $SESSION_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`)],
  }),
  responses: { 200: jsonResponse("The Runners.", envelope(RunnersSchema)), ...errorResponses(400, 401, 403) },
});

export const removeRunnerDoc = describeRoute({
  tags: ["runners"],
  security: SERVICE_SECURITY,
  summary: "Remove a Runner",
  description: routeText({
    context: "A member removes a Runner of the account. A connected computer stops working at once, and its app shows that it was removed. A pairing code that was not used stops working.",
    steps: [
      "The Worker checks the session and that the login holds a Role in the account named by `x-account-id`.",
      "The Worker marks the Runner removed and clears its pairing code, but only if it belongs to the account and is not already removed.",
      "A Runner of another account, or one already removed, is 404.",
    ],
    example: ["Remove a Runner:", bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/runners/${RUNNER_ID} \\`, '  -H "authorization: Bearer $SESSION_TOKEN" \\', `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`)],
  }),
  responses: { 200: jsonResponse("The Runner is removed.", envelope(RunnerRemovedSchema)), ...errorResponses(400, 401, 403, 404) },
});
