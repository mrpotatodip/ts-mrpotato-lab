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
  info: { title: "Amelie Engine API", version, description: OPENAPI_DESCRIPTION },
  tags: [
    { name: "system", description: "Check that the server runs." },
    { name: "sign-up", description: "An invited person starts their own cafe." },
    { name: "tenants", description: "The Tenants a signed-in Person belongs to." },
    { name: "me", description: "Who the signed-in login is: superuser or not." },
    { name: "admin", description: "The platform admin area. Superusers only." },
    { name: "invite-codes", description: "Invite codes for sign-up: create, list, revoke. Superusers only." },
    { name: "team", description: "Team members and Team invites on one Tenant." },
    { name: "chat-bot", description: "Chat for a signed-in team member (dashboard)." },
    { name: "unanswered-questions", description: "Questions that Customers asked and the assistant could not answer." },
    { name: "public-chat-bot", description: "Chat for an anonymous Customer (widget)." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "The session token from POST /auth/sign-in/email. Send it as `Authorization: Bearer <token>`.",
      },
    },
  },
};

// -----
// The default 400 body of hono-openapi is
// not our envelope; this one is.
// -----
export const validationErrorResponse: Exclude<
  OpenApiOptions["defaultValidationErrorResponse"],
  boolean | undefined
> = {
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
              message: { type: "string", example: "content: Too small: expected string to have >=1 characters" },
            },
            required: ["code", "message"],
          },
        },
        required: ["data", "error"],
      },
    },
  },
};
