import { describeRoute } from "hono-openapi";
import { EXAMPLE_BASE_URL, bash, errorResponses, routeText } from "#/lib/openapi";

export const getMenuItemImageDoc = describeRoute({
  tags: ["menu"],
  summary: "Fetch a menu item image",
  parameters: [
    { in: "path", name: "imageId", required: true, description: "The id of the Menu item image.", schema: { type: "string", format: "uuid" } },
  ],
  description: routeText({
    context:
      "The photo bytes for one Menu item image. Knowing the id is enough; there is no session. Chat cards and the dashboard use this URL.",
    steps: [
      "The server loads the image by id. If there is none, the answer is 404.",
      "The server reads the object from storage and returns the bytes with the stored content type and a year-long immutable cache, because a new photo is a new id.",
    ],
    example: [bash(`curl "${EXAMPLE_BASE_URL}/menu-item-images/$IMAGE_ID" --output photo.jpg`)],
  }),
  responses: {
    200: {
      description: "The image bytes.",
      content: {
        "image/jpeg": { schema: { type: "string", format: "binary" } },
        "image/png": { schema: { type: "string", format: "binary" } },
        "image/webp": { schema: { type: "string", format: "binary" } },
      },
    },
    ...errorResponses(404),
  },
});
