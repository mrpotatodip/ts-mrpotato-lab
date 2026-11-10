import { createMiddleware } from "hono/factory";
import type { openAPIRouteHandler } from "hono-openapi";
import { OPENAPI_DESCRIPTION } from "#/constants";
import { NotFoundError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { version } from "../../package.json";

// -----
// The spec is for developers: served only when
// ENVIRONMENT is "development" (.dev.vars).
// Anything else, a Worker deploy included, is a 404.
// -----
export const requireOpenApiEnabled = createMiddleware<AppEnv>(async (c, next) => {
  if (c.env.ENVIRONMENT !== "development") throw new NotFoundError("Route not found");
  await next();
});

type OpenApiOptions = NonNullable<Parameters<typeof openAPIRouteHandler>[1]>;

export const openApiDocument: OpenApiOptions["documentation"] = {
  info: { title: "EliseLAB Engine API", version, description: OPENAPI_DESCRIPTION },
  tags: [{ name: "scans", description: "Start a security scan of a public repo, then read its status and report." }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "The service token. Send it as `Authorization: Bearer <SCAN_API_TOKEN>`. Only a server may hold it.",
      },
    },
  },
};

// -----
// The default 400 body of hono-openapi is
// not our envelope; this one is.
// -----
export const validationErrorResponse: Exclude<OpenApiOptions["defaultValidationErrorResponse"], boolean | undefined> = {
  description: "The request is not valid. The message names the field that is wrong.",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          data: { type: "null" },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "repo: Invalid string: must match pattern" },
            },
            required: ["code", "message"],
          },
        },
        required: ["data", "error"],
      },
    },
  },
};
