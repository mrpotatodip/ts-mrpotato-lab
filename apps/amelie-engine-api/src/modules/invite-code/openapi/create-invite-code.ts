import { describeRoute } from "hono-openapi";
import { CreatedInviteCodeSchema } from "@repo/contracts/amelie";
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

export const createInviteCodeDoc = describeRoute({
  tags: ["invite-codes"],
  summary: "Create an invite code",
  security: STAFF_SECURITY,
  description: routeText({
    context:
      "A superuser makes an invite code and hands it to one person who may start a cafe. The plain code is shown once, in this answer. It is never stored and never listed again, so copy it now.",
    steps: [
      "The server checks that the caller is a superuser. Anyone else gets 404.",
      "The server makes 12 random characters and shows them in groups of four, for example `K7M2-9QXA-4TWB`.",
      "The server saves only a hash of the code, with the note, the number of uses, the optional expiry and the superuser who made it.",
      "The server returns the plain code and the summary of the saved code.",
    ],
    example: [
      "A code for one person, valid until the end of the year. `note`, `maxUses` (default 1) and `expiresAt` (default none) are optional:",
      bash(
        `curl -X POST ${EXAMPLE_BASE_URL}/admin/invite-codes -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"note":"Ada, Sorella Cafe","maxUses":1,"expiresAt":"2026-12-31T23:59:59.000Z"}'`,
      ),
      json(
        `{\n  "data": {\n    "code": "K7M2-9QXA-4TWB",\n    "inviteCode": { "id": "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d", "note": "Ada, Sorella Cafe", "status": "active", "useCount": 0, "maxUses": 1, "createdAt": "2026-10-09T09:00:00.000Z", "expiresAt": "2026-12-31T23:59:59.000Z", "revokedAt": null, "createdByName": "Jay Cantones" }\n  },\n  "error": null\n}`,
      ),
    ],
  }),
  responses: {
    201: jsonResponse("The plain code, shown once, and its summary.", envelope(CreatedInviteCodeSchema)),
    ...errorResponses(400, 401, 404),
  },
});
