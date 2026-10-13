import { describeRoute } from "hono-openapi";
import { EXAMPLE_BASE_URL, bash, envelope, json, jsonResponse, routeText } from "#/lib/openapi";
import { HealthSchema } from "#/modules/system/schemas/health-schema";

export const healthDoc = describeRoute({
  tags: ["system"],
  summary: "Check that the server runs",
  description: routeText({
    context:
      "A teammate or a script needs to know if the server is up. This route answers that. It needs no sign-in and reads no database.",
    steps: ["The server receives the request.", "The server answers `ok: true` and its version."],
    example: [
      "Run this first to test your setup:",
      bash(`curl ${EXAMPLE_BASE_URL}/health`),
      "You get:",
      json('{ "data": { "ok": true, "version": "1.0.2" }, "error": null }'),
    ],
  }),
  responses: { 200: jsonResponse("The server runs.", envelope(HealthSchema)) },
});
