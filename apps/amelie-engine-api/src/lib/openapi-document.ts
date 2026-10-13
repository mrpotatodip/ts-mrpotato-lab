import { createMiddleware } from "hono/factory";
import type { openAPIRouteHandler } from "hono-openapi";
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

const DESCRIPTION = `\
Amelie is an AI customer assistant. It answers a Customer's questions for one Tenant, \
from that Tenant's own information.

**How to read these docs.** Each route has a short context, the steps it follows, and \
one simple example you can copy.

**Two kinds of caller.**
- A *team member* signs in on the dashboard. The routes under \`/tenants\`, \`/chat-bot\` and \`/unanswered-questions\` are theirs. \
They need the session token and (for chat and Unanswered questions) a \`tenantId\`.
- A *Customer* is anonymous. The routes under \`/public/chat-bot\` are the Customer's. \
They need an \`x-anonymous-id\` header and a Tenant slug.

**Every answer is an envelope.** A success looks like \`{ "data": ..., "error": null }\`. \
A failure looks like \`{ "data": null, "error": { "code": "...", "message": "..." } }\`. \
The two chat routes that stream are the exception: they send server-sent events.

**Sign-in routes.** Sign-in and sign-out live under \`/auth/*\`. better-auth owns them, \
so they are not listed here.
`;

export const openApiDocument: OpenApiOptions["documentation"] = {
  info: { title: "Amelie Engine API", version, description: DESCRIPTION },
  tags: [
    { name: "system", description: "Check that the server runs." },
    { name: "sign-up", description: "An invited person starts their own cafe." },
    { name: "tenants", description: "The Tenants a signed-in Person belongs to." },
    { name: "me", description: "Who the signed-in login is: superuser or not." },
    { name: "admin", description: "The platform admin area. Superusers only." },
    { name: "invite-codes", description: "Invite codes for sign-up: create, list, revoke. Superusers only." },
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
