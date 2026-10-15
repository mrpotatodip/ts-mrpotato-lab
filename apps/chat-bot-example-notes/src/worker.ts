import type { ExecutionContext } from "hono";
import { createNotesApp } from "./index";
import { openaiRunner } from "./model";

type Env = { OPENAI_API_KEY: string; NOTES_MODEL?: string };

const DEFAULT_MODEL = "gpt-4o-mini";

// -----
// A Cloudflare Worker entry: the key and the model
// come from the environment, so you change them
// with a secret and a var, not a code edit. The
// app is built once, because its notebook and
// threads live in it.
// -----
let host: ReturnType<typeof createNotesApp> | undefined;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    host ??= createNotesApp({
      runner: openaiRunner(env.OPENAI_API_KEY),
      model: env.NOTES_MODEL ?? DEFAULT_MODEL,
    });
    return host.app.fetch(request, env, ctx);
  },
};
