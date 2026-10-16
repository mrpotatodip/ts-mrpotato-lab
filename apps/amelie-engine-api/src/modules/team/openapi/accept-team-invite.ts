import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import { AcceptTeamInviteBodySchema, AcceptedTeamInviteSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const acceptTeamInviteDoc = describeRoute({
  tags: ["team"],
  summary: "Accept a Team invite",
  parameters: [{ in: "path", name: "token", required: true, schema: { type: "string" } }],
  requestBody: { required: true, content: { "application/json": { schema: resolver(AcceptTeamInviteBodySchema) } } },
  description: routeText({
    context:
      "The invited email accepts the Team invite. A new Person sets name and password. An existing login must be signed in as that email.",
    steps: [
      "The server hashes the token and finds a pending, unexpired Team invite.",
      "If the email already has a login, the session must be that Person or the answer is 403.",
      "If the email is new, firstName, lastName and password create the login and Person.",
      "The server writes the Party role and marks the invite accepted.",
    ],
    example: [
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/public/team-invites/$TOKEN/accept -H "Content-Type: application/json" -d '{"firstName":"Leo","lastName":"Rossi","password":"correct-horse-battery"}'`,
      ),
      json('{ "data": { "tenantId": "…" }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The Tenant the Person joined.", envelope(AcceptedTeamInviteSchema)),
    ...errorResponses(400, 403, 404, 409),
  },
});
