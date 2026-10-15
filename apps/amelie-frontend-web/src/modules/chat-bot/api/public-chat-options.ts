import { z } from "zod";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { fetchServerSentEvents } from "@tanstack/ai-react";
import { ChatBotOutputSchema } from "@repo/contracts/chat-bots";
import type { PublicChatStreamBody } from "@repo/contracts/amelie";

import { API_BASE_URL } from "#/lib/api-base-url";
import { PUBLIC_CHAT_BAD_REQUEST_STATUS, PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS } from "../constants";
import { ChatBotWirePayloadSchema } from "../schemas";
import type { PublicChatSession } from "../types";
import {
  clearChatBotPendingReplyOnRunEnd,
  getChatBotStreamThreadId,
  getPublicChatSession,
  markChatBotPendingReply,
  notifyChatBotThreadCreated,
  recordChatBotStreamEvent,
  recordChatBotToolDisplay,
  setChatBotStreamThreadId,
  setPublicChatSession,
} from "../stores";
import { lastUserContent, writePublicChatThreadId } from "../utils";

const PUBLIC_CHAT_FALLBACK_ERROR = "The chat isn't available right now. Please try again.";

const PublicChatErrorBodySchema = z.object({ error: z.object({ message: z.string() }) });

const PublicChatRunRefSchema = z.object({ threadId: z.string(), runId: z.string() });

function requirePublicChatSession() {
  const session = getPublicChatSession();
  if (!session) throw new Error(PUBLIC_CHAT_FALLBACK_ERROR);
  return session;
}

// -----
// TanStack shows a thrown fetch error as "read
// failed"; a RUN_ERROR keeps the engine's words.
// -----
async function toPublicChatErrorStream(response: Response, init: RequestInit | undefined): Promise<Response> {
  const body = PublicChatErrorBodySchema.safeParse(await response.json().catch(() => null));
  const run = PublicChatRunRefSchema.safeParse(JSON.parse(z.string().catch("{}").parse(init?.body)));
  const chunk: StreamChunk = {
    type: EventType.RUN_ERROR,
    threadId: run.success ? run.data.threadId : "public-chat",
    runId: run.success ? run.data.runId : "public-chat",
    timestamp: Date.now(),
    message: body.success ? body.data.error.message : PUBLIC_CHAT_FALLBACK_ERROR,
  };
  return new Response(`data: ${JSON.stringify(chunk)}\n\n`, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// -----
// TanStack posts its whole wire payload; the
// engine takes only slug, thread, the text and,
// on a new Thread's first message, the location
// and the country.
// -----
export function toPublicChatBody(
  init: RequestInit | undefined,
  slug: string,
  place: Pick<PublicChatSession, "location" | "country">,
): string | undefined {
  const raw = z.string().safeParse(init?.body);
  if (!raw.success) return undefined;
  const wire = ChatBotWirePayloadSchema.safeParse(JSON.parse(raw.data));
  const body: PublicChatStreamBody = {
    slug,
    content: wire.success ? (lastUserContent(wire.data) ?? "") : "",
    threadId: getChatBotStreamThreadId(),
    ...(getChatBotStreamThreadId() === undefined && {
      ...(place.location !== undefined && { location: place.location }),
      ...(place.country !== undefined && { country: place.country }),
    }),
  };
  return JSON.stringify(body);
}

// -----
// A link naming a Location or Country the cafe
// doesn't have (404), or a pair that don't fit
// (400), shows the engine's error once; the next
// message then starts cafe-wide.
// -----
export function isPublicChatPlaceRejection(status: number): boolean {
  return status === PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS || status === PUBLIC_CHAT_BAD_REQUEST_STATUS;
}

export function dropPublicChatPlace(): void {
  const session = getPublicChatSession();
  if (session) setPublicChatSession({ ...session, location: undefined, country: undefined });
}

export function publicChatUrl(): string {
  const params = new URLSearchParams({ slug: requirePublicChatSession().slug });
  const threadId = getChatBotStreamThreadId();
  if (threadId) params.set("threadId", threadId);
  return `${API_BASE_URL}/public/chat-bot?${params}`;
}

export function dropGonePublicChatThread(): void {
  const session = getPublicChatSession();
  if (session) writePublicChatThreadId(session.slug, null);
  setChatBotStreamThreadId(undefined);
}

export function emptyPublicChatHydrateResponse(): Response {
  return new Response(JSON.stringify({ messages: [], activeRun: null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function publicChatFetchClient(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { slug, location, country } = requirePublicChatSession();
  const sending = init?.method === "POST";
  const startsNewThread = sending && getChatBotStreamThreadId() === undefined;
  const response = await fetch(input, sending ? { ...init, body: toPublicChatBody(init, slug, { location, country }) } : init);
  if (!response.ok) {
    if (response.status === PUBLIC_CHAT_THREAD_NOT_FOUND_STATUS) {
      dropGonePublicChatThread();
      if (!sending) return emptyPublicChatHydrateResponse();
    }
    if (sending && startsNewThread && isPublicChatPlaceRejection(response.status)) dropPublicChatPlace();
    return sending ? toPublicChatErrorStream(response, init) : response;
  }
  const threadId = response.headers.get("X-Thread-Id");
  if (threadId) markChatBotPendingReply(threadId);
  if (threadId && startsNewThread) notifyChatBotThreadCreated(threadId);
  return response;
}

export const publicChatOptions = {
  connection: fetchServerSentEvents(publicChatUrl, () => ({
    headers: { "X-Anonymous-Id": requirePublicChatSession().anonymousId },
    fetchClient: publicChatFetchClient,
  })),
  outputSchema: ChatBotOutputSchema,
  onChunk: (chunk: StreamChunk) => {
    recordChatBotStreamEvent(chunk);
    clearChatBotPendingReplyOnRunEnd(chunk);
  },
  onCustomEvent: recordChatBotToolDisplay,
};
