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

export const getMeDoc = describeRoute({
  tags: ["me"],
  summary: "Who am I",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "The dashboard needs to know if the signed-in Person is a superuser, to show the Admin link and to open the /admin area.",
    steps: [
      "The server reads the signed-in login from the session token.",
      "The server checks if the Person of this login holds the global `superuser` Role.",
      "The server returns `isSuperuser`. The Role gives no access to any cafe.",
    ],
    example: [
      bash(`curl ${EXAMPLE_BASE_URL}/me -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": { "isSuperuser": false }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("Whether this Person is a superuser.", envelope(MeSchema)),
    ...errorResponses(401),
  },
});
