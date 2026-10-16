import { describeRoute } from "hono-openapi";
import { TeamInvitePreviewSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const getTeamInvitePreviewDoc = describeRoute({
  tags: ["team"],
  summary: "Read a Team invite join page",
  parameters: [{ in: "path", name: "token", required: true, schema: { type: "string" } }],
  description: routeText({
    context:
      "The join page names the cafe, the invited email and the Role. No session is required. The token is the secret.",
    steps: [
      "The server hashes the token and finds a pending, unexpired Team invite.",
      "Unknown, expired, revoked or already accepted tokens are 404.",
      "hasAccount is true when that email already has a login.",
    ],
    example: [
      bash(`curl ${EXAMPLE_BASE_URL}/public/team-invites/$TOKEN`),
      json(
        '{ "data": { "cafeName": "Sorella Cafe", "email": "leo@sorella.test", "role": "store_staff", "hasAccount": false }, "error": null }',
      ),
    ],
  }),
  responses: {
    200: jsonResponse("What the join page shows.", envelope(TeamInvitePreviewSchema)),
    ...errorResponses(404),
  },
});
