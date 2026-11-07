import { Hono } from "hono";
import { createAuth } from "#/lib/auth";
import type { AppEnv } from "#/types/variables";

const app = new Hono<AppEnv>();

// -----
// better-auth owns everything under /auth: sign-in,
// sign-out, get-session. Its disabled paths are
// listed in lib/auth.ts.
// -----
app.on(["GET", "POST"], "/*", async (c) => {
  const { auth, close } = createAuth(c);
  try {
    return await auth.handler(c.req.raw);
  } finally {
    close();
  }
});

export default app;
