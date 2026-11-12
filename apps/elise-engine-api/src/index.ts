import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { openAPIRouteHandler } from "hono-openapi";
import { realAppDeps } from "#/lib/app-deps";
import { AppError, TooManyRequestsError } from "#/lib/errors";
import { rateLimitByIp } from "#/lib/rate-limit";
import { openApiDocument, requireOpenApiEnabled, validationErrorResponse } from "#/lib/openapi-document";
import { errorChainForLog } from "#/lib/redact-log";
import { requireScanAccess } from "#/lib/require-scan-access";
import authRoutes from "#/modules/auth";
import filesRoutes from "#/modules/files";
import findingsRoutes from "#/modules/findings";
import githubRoutes from "#/modules/github-installs";
import groupsRoutes from "#/modules/groups";
import meRoutes from "#/modules/me";
import reposRoutes from "#/modules/repos";
import runnersRoutes from "#/modules/runners";
import scansRoutes from "#/modules/scans";
import signUpRoutes from "#/modules/sign-up";
import teamRoutes from "#/modules/team";
import type { QueuedEmail } from "#/modules/auth/types";
import { consumeQueuedEmails } from "#/modules/team/lib";
import anthropicKeyRoutes from "#/modules/anthropic-key";
import creditRoutes from "#/modules/credit/api";
import planRoutes from "#/modules/plan/api";
import usageRoutes from "#/modules/usage";
import verdictRoutes from "#/modules/verdict";
import type { AppEnv, AppDeps, Bindings } from "#/types/variables";

export { Outbound, ScanSandbox } from "#/modules/scan-sandbox";
export { ScanWorkflow } from "#/modules/scan-workflow";

export const buildApp = (deps: AppDeps = realAppDeps) => {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    c.set("deps", deps);
    await next();
    c.header("strict-transport-security", "max-age=31536000");
    c.header("x-content-type-options", "nosniff");
  });

  // -----
  // Every /scans route needs the service token or a
  // signed-in session. /auth, /sign-up and /me do
  // their own checks, and so do /team and /groups. The OpenAPI routes below are
  // not here: they answer only in development.
  // -----
  app.use("/scans/*", requireScanAccess);
  app.use("/usage/*", requireScanAccess);
  app.use("/findings/*", requireScanAccess);
  app.use("/files/*", requireScanAccess);
  app.use("/repos/*", requireScanAccess);
  app.use(
    "/auth/sign-in/*",
    rateLimitByIp("SIGN_IN_LIMITER", () => new TooManyRequestsError("Too many sign-in attempts. Wait a minute and try again.", "SIGN_IN_RATE_LIMITED")),
  );

  app.use(
    "/auth/request-password-reset",
    rateLimitByIp("PASSWORD_RESET_LIMITER", () => new TooManyRequestsError("Too many reset requests. Wait a minute and try again.", "PASSWORD_RESET_RATE_LIMITED")),
  );

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      // SAFETY: an error response always has a body, so its status is never 1xx, 204 or 304.
      return c.json({ data: null, error: { code: "HTTP_ERROR", message: err.message } }, err.status as ContentfulStatusCode);
    }

    if (err instanceof AppError) {
      const internal = err.statusCode >= 500;
      if (internal) console.error("AppError reached app.onError", errorChainForLog(err));
      // SAFETY: AppError subclasses only use 4xx and 5xx codes, never a no-content status.
      return c.json(
        { data: null, error: { code: err.code, message: internal ? "Internal server error" : err.message } },
        err.statusCode as ContentfulStatusCode,
      );
    }

    console.error("Unclassified error reached app.onError", errorChainForLog(err));
    return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
  });

  const routes = app.route("/scans", scansRoutes).route("/auth", authRoutes).route("/sign-up", signUpRoutes).route("/me", meRoutes).route("/usage", usageRoutes).route("/usage/anthropic-key", anthropicKeyRoutes).route("/usage/credit", creditRoutes).route("/usage/plan", planRoutes).route("/findings", findingsRoutes).route("/files", filesRoutes).route("/github", githubRoutes).route("/team", teamRoutes).route("/groups", groupsRoutes).route("/repos", reposRoutes).route("/repos", verdictRoutes).route("/runners", runnersRoutes);

  // -----
  // The OpenAPI spec, for developers only.
  // Mounted after the routes it describes.
  // -----
  app.get(
    "/openapi.json",
    requireOpenApiEnabled,
    openAPIRouteHandler(app, { documentation: openApiDocument, defaultValidationErrorResponse: validationErrorResponse }),
  );

  // -----
  // The same spec as a page you can read and try
  // (Scalar). Same dev-only gate.
  // -----
  app.get("/docs", requireOpenApiEnabled, Scalar({ url: "/openapi.json" }));

  // -----
  // Hono only calls notFound on the top-level
  // app, so the envelope 404 lives here.
  // -----
  app.notFound((c) => c.json({ data: null, error: { code: "NOT_FOUND", message: "Route not found" } }, 404));

  return { app, routes };
};

export default {
  fetch: buildApp().app.fetch,
  queue: (batch: MessageBatch<QueuedEmail>, env: Bindings) => consumeQueuedEmails(batch, env),
};

export type AppType = ReturnType<typeof buildApp>["routes"];
