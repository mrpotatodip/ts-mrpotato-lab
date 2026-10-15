import { resolveResumeRunId, type StreamDurability } from "@tanstack/ai";
import { createChatBotDurableStream } from "./durable-stream";
import { pgChatBotDurableStreamStore } from "./pg-stream-store";
import { readChatBotDurableStreamResumeOffset } from "./stream-offset";
import type { ChatBotDurableStreamOptions } from "../pg-types";
import type { ChatBotDurableStreamInit } from "./types";

// -----
// The one-call form, like durableStream(). A
// Request names its run via X-Run-Id or ?runId.
// -----
export function pgChatBotDurableStream(
  source: Request | Pick<ChatBotDurableStreamInit, "runId" | "offset">,
  options: ChatBotDurableStreamOptions,
): StreamDurability {
  const { db, pollMs, ...shared } = options;
  const store = pgChatBotDurableStreamStore(db, { pollMs });
  if (!(source instanceof Request)) {
    return createChatBotDurableStream(store, { ...source, ...shared });
  }
  // -----
  // Never mint an id here: a made-up run is
  // one no reader could ever name.
  // -----
  const runId = resolveResumeRunId(source);
  if (!runId) {
    throw new Error("Durable stream needs a runId: send X-Run-Id or ?runId");
  }
  return createChatBotDurableStream(store, {
    runId,
    offset: readChatBotDurableStreamResumeOffset(source),
    ...shared,
  });
}
