import { getAuthCookie } from "#/lib/auth-cookie";
import { API_BASE_URL } from "#/lib/api-base-url";
import { withActiveTenant } from "#/lib/active-tenant";
import type { StaffChatStreamBody } from "@repo/contracts/amelie";

type ChatBotUpstreamInit = {
  method: "GET" | "POST";
  accept: string;
  signal: AbortSignal;
  incoming?: Headers;
  body?: StaffChatStreamBody;
};

// -----
// Resume headers pass through so the engine
// can replay a run from its last event.
// -----
function chatBotHeaders({ accept, incoming, body }: ChatBotUpstreamInit): Headers {
  const token = getAuthCookie();
  const headers = new Headers({
    Accept: accept,
    Origin: new URL(API_BASE_URL).origin,
  });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body) headers.set("Content-Type", "application/json");
  const runId = incoming?.get("X-Run-Id");
  const lastEventId = incoming?.get("Last-Event-ID");
  if (runId) headers.set("X-Run-Id", runId);
  if (lastEventId) headers.set("Last-Event-ID", lastEventId);
  return headers;
}

// -----
// The engine's response as-is: errors keep
// its { data, error } body and status.
// -----
export async function fetchChatBotUpstream(
  path: string,
  init: ChatBotUpstreamInit,
): Promise<Response> {
  return fetch(`${API_BASE_URL}${await withActiveTenant(path)}`, {
    method: init.method,
    headers: chatBotHeaders(init),
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
}
