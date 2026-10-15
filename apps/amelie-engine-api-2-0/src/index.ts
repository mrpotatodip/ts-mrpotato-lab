import { Hono } from "hono";
import { chatBotRoutes, type Bindings } from "./chat-bot";
import { HttpError } from "./http";

export function createApp(routes = chatBotRoutes()) {
  const app = new Hono<{ Bindings: Bindings }>();

  app.get("/health", (c) => c.json({ data: { ok: true }, error: null }));
  app.route("/chat-bot", routes);

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json({ data: null, error: { code: "HTTP_ERROR", message: error.message } }, error.status);
    }
    console.error("unhandled", error);
    return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
  });

  return app;
}

export default createApp();
