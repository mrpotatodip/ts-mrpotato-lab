import { describeRoute } from "hono-openapi";
import { InviteCodeSchema } from "@repo/contracts/amelie";
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

export const revokeInviteCodeDoc = describeRoute({
  tags: ["invite-codes"],
  summary: "Revoke an invite code",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "A superuser turns an invite code off, for example when it was sent to the wrong person. The code stays in the list as history with the status `revoked`.",
    steps: [
      "The server checks that the caller is a superuser. Anyone else gets 404.",
      "The server looks the code up. An unknown id gets 404.",
      "The server sets the revoke time. A code that is already revoked keeps its first time, and the answer is still 200.",
      "The server returns the code summary.",
    ],
    example: [
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/admin/invite-codes/9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d/revoke -H "Authorization: Bearer $TOKEN"`,
      ),
      json(
        `{\n  "data": { "id": "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d", "note": "Ada, Sorella Cafe", "status": "revoked", "useCount": 0, "maxUses": 1, "createdAt": "2026-10-09T09:00:00.000Z", "expiresAt": null, "revokedAt": "2026-10-09T10:30:00.000Z", "createdByName": "Jay Cantones" },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("The code, now revoked.", envelope(InviteCodeSchema)),
    ...errorResponses(400, 401, 404),
  },
});
