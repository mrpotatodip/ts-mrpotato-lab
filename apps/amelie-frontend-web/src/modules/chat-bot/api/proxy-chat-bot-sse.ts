import { ChatBotThreadIdSchema } from "@repo/contracts/chat-bots";
import { StaffChatStreamBodySchema } from "@repo/contracts/amelie";
import { ChatBotWirePayloadSchema } from "../schemas";
import { lastUserContent } from "../utils";
import { fetchChatBotUpstream } from "./chat-bot-upstream";

function backendChatBotPath(request: Request): string {
  const url = new URL(request.url);
  return url.search ? `/chat-bot${url.search}` : "/chat-bot";
}

function isChatBotResumeRequest(request: Request): boolean {
  if (request.headers.get("Last-Event-ID")) return true;
  return new URL(request.url).searchParams.get("offset") != null;
}

function invalidChatBotBody(): Response {
  return Response.json(
    {
      data: null,
      error: { code: "VALIDATION_ERROR", message: "Invalid chat body" },
    },
    { status: 400 },
  );
}

export async function proxyChatBotSse(request: Request): Promise<Response> {
  const json = await request.json().catch(() => null);
  const staff = StaffChatStreamBodySchema.safeParse(json);
  const queryThread = ChatBotThreadIdSchema.safeParse(
    new URL(request.url).searchParams.get("threadId"),
  );
  const wire = ChatBotWirePayloadSchema.safeParse(json);
  const parsed = staff.success
    ? staff
    : StaffChatStreamBodySchema.safeParse({
        content: wire.success ? (lastUserContent(wire.data) ?? "") : "",
        threadId: queryThread.success ? queryThread.data : undefined,
      });
  if (!parsed.success) return invalidChatBotBody();

  return fetchChatBotUpstream("/chat-bot", {
    method: "POST",
    accept: "text/event-stream",
    signal: request.signal,
    incoming: request.headers,
    body: parsed.data,
  });
}

// -----
// Resume replays the run's SSE; otherwise the
// bare { messages, activeRun } hydrate body.
// -----
export function proxyChatBotGet(request: Request): Promise<Response> {
  if (isChatBotResumeRequest(request)) {
    return fetchChatBotUpstream(backendChatBotPath(request), {
      method: "GET",
      accept: "text/event-stream",
      signal: request.signal,
      incoming: request.headers,
    });
  }
  return fetchChatBotUpstream(backendChatBotPath(request), {
    method: "GET",
    accept: "application/json",
    signal: request.signal,
  });
}
