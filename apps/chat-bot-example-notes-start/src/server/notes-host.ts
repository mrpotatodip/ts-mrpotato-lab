import { Hono, type ExecutionContext } from "hono";
import { createNotesApp, type NotesAppConfig } from "../notes/app";
import { openaiRunner } from "../notes/model";

const DEFAULT_MODEL = "gpt-4o-mini";

// -----
// A long-lived Node server has no per-request
// context; the process outlives the response, so
// a background job just runs to the end. On
// Cloudflare this is where its waitUntil goes.
// -----
const executionContext: ExecutionContext = {
  waitUntil: (job) => {
    job.catch((error: unknown) => console.error("chat-bot: background job failed", error));
  },
  passThroughOnException: () => undefined,
  props: {},
};

// -----
// Who is calling is decided here, on the server,
// from the request. The notes host reads two
// headers; the browser never gets to send them.
// Swap the cookie for your Start session.
// -----
function withIdentity(request: Request): Request {
  const cookie = request.headers.get("cookie") ?? "";
  const member = /(?:^|;\s*)member=([^;]+)/.exec(cookie)?.[1] ?? "guest";
  const headers = new Headers(request.headers);
  headers.set("x-workspace", "demo");
  headers.set("x-member", decodeURIComponent(member));
  // -----
  // Built from its parts, not copied with
  // new Request(request): Start's request is not
  // one that constructor accepts.
  // -----
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(request.url, {
    method: request.method,
    headers,
    body: hasBody ? request.body : null,
    signal: request.signal,
    ...(hasBody ? { duplex: "half" } : {}),
  });
}

export function createNotesFetch(config: NotesAppConfig): (request: Request) => Promise<Response> {
  const api = new Hono().route("/api", createNotesApp(config).app);
  return async (request) => api.fetch(withIdentity(request), {}, executionContext);
}

// -----
// Built on first use, so the app starts without a
// key and only a chat request needs one.
// -----
let notesFetch: ReturnType<typeof createNotesFetch> | undefined;

export function handleNotes(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Promise.resolve(
      Response.json(
        { data: null, error: { message: "Set OPENAI_API_KEY in .env" } },
        { status: 500 },
      ),
    );
  }
  notesFetch ??= createNotesFetch({
    runner: openaiRunner(apiKey),
    model: process.env.NOTES_MODEL ?? DEFAULT_MODEL,
  });
  return notesFetch(request);
}
