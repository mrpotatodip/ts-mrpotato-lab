import { describeRoute } from "hono-openapi";
import { AnthropicKeySchema } from "@repo/contracts/elise";
import { EXAMPLE_ACCOUNT_ID, EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, json, jsonResponse, routeText } from "#/lib/openapi";

const SESSION = '  -H "authorization: Bearer $SESSION_TOKEN" \\';
const ACCOUNT = `  -H "x-account-id: ${EXAMPLE_ACCOUNT_ID}"`;
const KEY_EXAMPLE = `{ "data": { "source": "account", "lastFour": "x9Qa", "updatedAt": "2026-11-11T09:00:00.000Z" }, "error": null }`;

export const getAnthropicKeyDoc = describeRoute({
  tags: ["usage"],
  summary: "Which Anthropic key the account's scans use",
  security: SERVICE_SECURITY,
  description: routeText({
    context: "By default scans run on the platform's Anthropic key. An account may bring its own, and then its scans run on that. The key itself is never returned.",
    steps: ["The Worker checks the token or session and the account.", "The Worker returns `source` (`platform` or `account`) and, for a key the account brought, its last four characters."],
    example: ["Read it:", bash(`curl ${EXAMPLE_BASE_URL}/usage/anthropic-key \\`, `  -H "authorization: Bearer $SCAN_API_TOKEN" \\`, ACCOUNT), json(KEY_EXAMPLE)],
  }),
  responses: { 200: jsonResponse("The key the account's scans use.", envelope(AnthropicKeySchema)), ...errorResponses(400, 401, 403) },
});

export const setAnthropicKeyDoc = describeRoute({
  tags: ["usage"],
  summary: "Bring your own Anthropic key",
  security: SERVICE_SECURITY,
  description: routeText({
    context: "An admin gives the account's own Anthropic API key. Scans started after this run on it, and its spend is billed to the account's Anthropic organization. A scan already running keeps the key it started with.",
    steps: [
      "The Worker checks the session and that the login's Role in the account holds `company:usage:anthropic_key:update`.",
      "The Worker asks Anthropic to list one model with the key. It answers 400 if Anthropic refuses the key, and 502 if Anthropic cannot answer.",
      "The Worker encrypts the key with a secret that is not in the database, and saves it with an audit row that holds only the last four characters, in one transaction.",
      "The Worker returns the last four characters. The key is never returned again.",
    ],
    example: [
      "Set the key:",
      bash(`curl -X PUT ${EXAMPLE_BASE_URL}/usage/anthropic-key \\`, SESSION, `${ACCOUNT} \\`, '  -H "Content-Type: application/json" \\', `  -d '{"apiKey":"sk-ant-api03-..."}'`),
      json(KEY_EXAMPLE),
    ],
  }),
  responses: { 200: jsonResponse("The key is saved.", envelope(AnthropicKeySchema)), ...errorResponses(400, 401, 403) },
});

export const removeAnthropicKeyDoc = describeRoute({
  tags: ["usage"],
  summary: "Go back to the platform's Anthropic key",
  security: SERVICE_SECURITY,
  description: routeText({
    context: "An admin removes the key the account brought, so its scans use the platform's key again.",
    steps: [
      "The Worker checks the session and that the login's Role in the account holds `company:usage:anthropic_key:update`.",
      "The Worker deletes the key and writes an audit row, in one transaction. With no key to remove, nothing changes.",
    ],
    example: [
      "Remove it:",
      bash(`curl -X DELETE ${EXAMPLE_BASE_URL}/usage/anthropic-key \\`, SESSION, ACCOUNT),
      json(`{ "data": { "source": "platform", "lastFour": null, "updatedAt": null }, "error": null }`),
    ],
  }),
  responses: { 200: jsonResponse("The account is on the platform key.", envelope(AnthropicKeySchema)), ...errorResponses(400, 401, 403) },
});
