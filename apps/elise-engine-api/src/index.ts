import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { openAPIRouteHandler } from "hono-openapi";
import { AppError } from "#/lib/errors";
import { openApiDocument, requireOpenApiEnabled, validationErrorResponse } from "#/lib/openapi-document";
import { errorChainForLog } from "#/lib/redact-log";
import { requireServiceToken } from "#/lib/require-service-token";
import scansRoutes from "#/modules/scans";
import type { AppEnv } from "#/types/variables";

export { Outbound, ScanSandbox } from "#/modules/scan-sandbox";
export { ScanWorkflow } from "#/modules/scan-workflow";

const app = new Hono<AppEnv>();

// -----
// Every /scans route needs the service token.
// The OpenAPI routes below are not here: they
// answer only in development.
// -----
app.use("/scans/*", requireServiceToken);

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

const routes = app.route("/scans", scansRoutes);

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

export default { fetch: app.fetch };

export type AppType = typeof routes;
