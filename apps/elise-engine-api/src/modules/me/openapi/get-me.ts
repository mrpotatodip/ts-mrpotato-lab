import { describeRoute } from "hono-openapi";
import { MeSchema } from "@repo/contracts/elise";
import { EXAMPLE_BASE_URL, SERVICE_SECURITY, bash, envelope, errorResponses, jsonResponse, routeText } from "#/lib/openapi";

export const getMeDoc = describeRoute({
  tags: ["me"],
  security: SERVICE_SECURITY,
  summary: "Who is signed in",
  description: routeText({
    context: "A dashboard shows who is signed in and which Accounts they can use. This route answers for the session of the request.",
    steps: [
      "The Worker checks the session (a cookie, or `Authorization: Bearer <session token>`).",
      "The Worker reads the login, the type of its Party and the Accounts where the Party holds a Role.",
      "The Worker returns them with a flag that says if the login is platform staff.",
    ],
    example: ["Ask who is signed in:", bash(`curl ${EXAMPLE_BASE_URL}/me \\`, '  -H "authorization: Bearer $SESSION_TOKEN"')],
  }),
  responses: { 200: jsonResponse("The login and its Accounts.", envelope(MeSchema)), ...errorResponses(401, 404) },
});
