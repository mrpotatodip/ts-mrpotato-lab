import { describeRoute } from "hono-openapi";
import { z } from "zod";
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

export const listInviteCodesDoc = describeRoute({
  tags: ["invite-codes"],
  summary: "List invite codes",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "A superuser sees every invite code that was made, newest first, with how it stands. The list never holds a code or its hash: a lost code cannot be read back, only replaced.",
    steps: [
      "The server checks that the caller is a superuser. Anyone else gets 404.",
      "The server reads every invite code, newest first.",
      "The server works out each status: `revoked` if it was revoked, else `expired` if the expiry has passed, else `used_up` if every use is taken, else `active`.",
    ],
    example: [
      bash(`curl ${EXAMPLE_BASE_URL}/admin/invite-codes -H "Authorization: Bearer $TOKEN"`),
      json(
        `{\n  "data": [\n    { "id": "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d", "note": "Ada, Sorella Cafe", "status": "active", "useCount": 0, "maxUses": 1, "createdAt": "2026-10-09T09:00:00.000Z", "expiresAt": null, "revokedAt": null, "createdByName": "Jay Cantones" }\n  ],\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    200: jsonResponse("Every invite code, newest first.", envelope(z.array(InviteCodeSchema))),
    ...errorResponses(401, 404),
  },
});
