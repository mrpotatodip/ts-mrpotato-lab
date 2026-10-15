import { z } from "zod";
import {
  ChatBotThreadDeletedSchema,
  ChatBotThreadListItemSchema,
  type ChatBotThreadListItem,
} from "@repo/chat-bot-api/contracts";

export type ChatBotRequestOptions = {
  endpoint: string;
  headers?: Record<string, string> | (() => Record<string, string>);
  credentials?: RequestCredentials;
  fetch?: typeof globalThis.fetch;
};

export const resolveHeaders = (headers: ChatBotRequestOptions["headers"]): Record<string, string> =>
  typeof headers === "function" ? headers() : (headers ?? {});

const EnvelopeSchema = z.object({
  data: z.unknown(),
  error: z.object({ message: z.string() }).nullable(),
});

// -----
// The engine answers { data, error }. A failure
// throws with the server's own message.
// -----
async function call<T extends z.ZodType>(
  options: ChatBotRequestOptions,
  path: string,
  init: { method: string; body?: unknown },
  schema: T,
): Promise<z.output<T>> {
  const send = options.fetch ?? globalThis.fetch;
  const response = await send(`${options.endpoint}${path}`, {
    method: init.method,
    credentials: options.credentials,
    headers: {
      ...resolveHeaders(options.headers),
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const envelope = EnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!envelope.success) throw new Error(`Unexpected response (${response.status})`);
  if (!response.ok || envelope.data.error) {
    throw new Error(envelope.data.error?.message ?? `Request failed (${response.status})`);
  }
  const data = schema.safeParse(envelope.data.data);
  if (!data.success) throw new Error(`Unexpected response (${response.status})`);
  return data.data;
}

export const fetchThreads = (options: ChatBotRequestOptions): Promise<ChatBotThreadListItem[]> =>
  call(options, "/threads", { method: "GET" }, ChatBotThreadListItemSchema.array());

export const renameThread = (
  options: ChatBotRequestOptions,
  id: string,
  title: string,
): Promise<ChatBotThreadListItem> =>
  call(options, `/threads/${id}`, { method: "PATCH", body: { title } }, ChatBotThreadListItemSchema);

export const deleteThread = (options: ChatBotRequestOptions, id: string) =>
  call(options, `/threads/${id}`, { method: "DELETE" }, ChatBotThreadDeletedSchema);
