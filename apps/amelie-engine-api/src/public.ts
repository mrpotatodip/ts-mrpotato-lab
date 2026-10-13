import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "#/lib/auth";
import { requireSignInLimit } from "#/lib/require-sign-in-limit";
import type { AppEnv } from "#/types/variables";
import { publicChatBotRestAPI } from "#/modules/chat-bot";
import systemRestAPI from "#/modules/system";
import mcpRestAPI from "#/modules/mcp";
import signUpRestAPI from "#/modules/sign-up";
import { getMenuItemImageAPI } from "#/modules/menu";

// -----
// No login: health, the login routes
// themselves, and the Customer's widget.
// -----
const app = new Hono<AppEnv>();

// -----
// better-auth's own CORS rule: before its
// routes, and only its trusted origins.
// -----
app.use("/auth/*", (c, next) =>
  cors({
    origin: c.env.AUTH_TRUSTED_ORIGINS.split(","),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["set-auth-token"],
  })(c, next),
);
app.use("/auth/sign-in/email", requireSignInLimit);

// -----
// One handler for better-auth's basePath;
// auth.ts turns off what the MVP doesn't use.
// -----
app.on(["GET", "POST"], "/auth/*", (c) => createAuth(c).handler(c.req.raw));

app.route("/", systemRestAPI);
app.route("/public/chat-bot", publicChatBotRestAPI);
app.route("/public/mcp", mcpRestAPI);
// invite-only: the invite code is the guard (#350)
app.route("/public/sign-up", signUpRestAPI);
// -----
// Menu item photos: the id is the secret.
// Chat cards load them without a session.
// -----
app.route("/menu-item-images", getMenuItemImageAPI);

export default app;
