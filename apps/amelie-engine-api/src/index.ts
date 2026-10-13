import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";
import { except } from "hono/combine";

import { AppError } from "#/lib/errors";
import { setEnvContext } from "#/lib/env-context";
import { errorChainForLog } from "#/lib/redact-log";
import {
  openApiDocument,
  requireOpenApiEnabled,
  validationErrorResponse,
} from "#/lib/openapi-document";
import type { AppEnv } from "#/types/variables";
import publicRoutes from "./public";
import privateRoutes from "./private";
import { handleImportQueue } from "#/modules/menu-import";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  setEnvContext(c.env);
  await next();
});

// -----
// Open CORS for everything but /auth/*,
// which public.ts limits to trusted origins.
// -----
app.use(
  "*",
  except(
    "/auth/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowHeaders: ["Content-Type", "Authorization", "X-Anonymous-Id", "X-Run-Id"],
      exposeHeaders: ["X-Thread-Id"],
    }),
  ),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // SAFETY: an error response always carries a
    // body, so its status is never a 1xx/204/304.
    return c.json(
      { data: null, error: { code: "HTTP_ERROR", message: err.message } },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof AppError) {
    // -----
    // A 5xx is logged once, here, with its cause;
    // the body never says why (Effect §4.4).
    // -----
    const internal = err.statusCode >= 500;
    if (internal) console.error("AppError reached app.onError", errorChainForLog(err));
    // SAFETY: AppError subclasses only use 4xx/5xx
    // codes, never a no-content status.
    return c.json(
      {
        data: null,
        error: { code: err.code, message: internal ? "Internal server error" : err.message },
      },
      err.statusCode as ContentfulStatusCode,
    );
  }

  console.error("Unclassified error reached app.onError", errorChainForLog(err));
  return c.json(
    {
      data: null,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    },
    500,
  );
});

// -----
// Routes: public.ts needs no login;
// private.ts guards its own paths.
// -----
const routes = app.route("/", publicRoutes).route("/", privateRoutes);

// -----
// The OpenAPI spec, for developers only.
// Mounted after the routes it describes.
// -----
app.get(
  "/openapi.json",
  requireOpenApiEnabled,
  openAPIRouteHandler(app, {
    documentation: openApiDocument,
    defaultValidationErrorResponse: validationErrorResponse,
  }),
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
app.notFound((c) =>
  c.json({ data: null, error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

export default {
  // http
  fetch: app.fetch,
  // menu imports (#347): one message per Import
  queue: handleImportQueue,
};

export type AppType = typeof routes;
