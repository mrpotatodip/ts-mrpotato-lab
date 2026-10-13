import { describeRoute } from "hono-openapi";
import { MeSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  STAFF_SECURITY,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const getAdminDoc = describeRoute({
  tags: ["admin"],
  summary: "Open the admin area",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "The /admin area is for platform superusers only. It has no data yet; this route is its first door.",
    steps: [
      "The server reads the signed-in login from the session token.",
      "The server checks that the Person holds the global `superuser` Role.",
      "If yes, it answers. If not, the answer is 404, never 403.",
    ],
    example: [
      bash(`curl ${EXAMPLE_BASE_URL}/admin -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": { "isSuperuser": true }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The caller is a superuser.", envelope(MeSchema)),
    ...errorResponses(401, 404),
  },
});
