import { describeRoute, resolver } from "hono-openapi";
import { PublishImportBodySchema, PublishedImportSchema } from "@repo/contracts/amelie";
import {
  EXAMPLE_BASE_URL,
  EXAMPLE_TENANT_ID,
  STAFF_SECURITY,
  TENANT_ID_QUERY_PARAMETER,
  bash,
  envelope,
  errorResponses,
  json,
  jsonResponse,
  routeText,
} from "#/lib/openapi";

export const publishImportDoc = describeRoute({
  tags: ["imports"],
  summary: "Publish a menu import",
  security: STAFF_SECURITY,
  parameters: [
    TENANT_ID_QUERY_PARAMETER,
    { in: "path", name: "importId", required: true, description: "The id of the Import.", schema: { type: "string", format: "uuid" } },
  ],
  requestBody: { required: true, content: { "application/json": { schema: resolver(PublishImportBodySchema) } } },
  description: routeText({
    context:
      "An owner or manager puts the approved drafts live. After this the assistant answers from the new menu, hours and contact facts.",
    steps: [
      "The server checks that the signed-in Person is an owner or manager of this Tenant. A staff member gets 403.",
      "The server checks that the Import is ready and not yet published. If not, the answer is 409.",
      "Everything below happens in one transaction. If any step fails, nothing changes.",
      "Country: menu items are priced in one Country, named with `countryId`. It is needed when the cafe has several open Countries and defaults to the only one otherwise. An archived, unknown or foreign Country is refused with 404 before anything is written. Items get a sold price row in that Country only.",
      "Menu: with mode `replace`, the server deletes the current menu first, including each Menu item image object in storage. With mode `add`, it keeps the current menu and reuses a category with the same name. Replace is refused with 400 when the cafe has several open Countries, since it would delete every Country's prices. It skips the menu when no menu draft is approved.",
      "Hours: approved weekly hours replace the weekly hours. Profile: approved contact facts fill only the fields that are empty.",
      "The server marks the Import as published and returns what it changed.",
    ],
    example: [
      bash(
        `curl -X POST "${EXAMPLE_BASE_URL}/imports/$IMPORT_ID/publish?tenantId=${EXAMPLE_TENANT_ID}" \\`,
        '  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\',
        '  -d \'{"mode":"replace"}\'',
      ),
      json('{ "data": { "menuCategories": 8, "menuItems": 62, "businessHours": 7, "profileFieldsFilled": 2 }, "error": null }'),
    ],
  }),
  responses: {
    200: jsonResponse("What the publish changed.", envelope(PublishedImportSchema)),
    ...errorResponses(400, 401, 403, 404, 409),
  },
});
