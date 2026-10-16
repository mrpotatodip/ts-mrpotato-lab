import { describeRoute } from "hono-openapi";
import { AdminAuditLogSchema } from "@repo/contracts/amelie";
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

export const listAdminAuditLogDoc = describeRoute({
  tags: ["admin-roles"],
  summary: "List role changes",
  security: STAFF_SECURITY,
  parameters: [
    { in: "query", name: "roleId", required: false, schema: { type: "string", format: "uuid" } },
    { in: "query", name: "limit", required: false, schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
  ],
  description: routeText({
    context:
      "The trail of who changed which role and when, newest first. Optionally for one role.",
    steps: [
      "The server checks that the caller is a superuser.",
      "The server returns up to `limit` entries (default 50, at most 200).",
    ],
    example: [
      bash(`curl "${EXAMPLE_BASE_URL}/admin/role-audit-log?roleId=$ROLE_ID&limit=20" -H "Authorization: Bearer $TOKEN"`),
      json('{ "data": [{ "id": "…", "actorEmail": "boss@amelie.test", "action": "role.enabled", "subjectId": "…", "before": { "enabled": false }, "after": { "enabled": true }, "createdAt": "2026-10-17T00:00:00.000Z" }], "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("The audit entries.", envelope(AdminAuditLogSchema)),
    ...errorResponses(400, 401, 404),
  },
});
