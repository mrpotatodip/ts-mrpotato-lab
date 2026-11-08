import { WorkerEntrypoint } from "cloudflare:workers";
import { z } from "zod";
import type { Bindings } from "#/types/variables";
import { SCAN_SANDBOX_MAX_OUTPUT_TOKENS } from "#/modules/scan-sandbox/constants";
import type { OutboundProps } from "#/modules/scan-sandbox/types";
import { allowedOutboundTarget, createUsageScanner } from "#/modules/scan-sandbox/utils";

const blocked = (reason: string) => new Response(`Blocked: ${reason}`, { status: 403 });

const MessagesBodySchema = z.looseObject({ model: z.string(), max_tokens: z.number().optional() });

const parseMessagesBody = (text: string) => {
  try {
    const parsed = MessagesBodySchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export class Outbound extends WorkerEntrypoint<Bindings, OutboundProps> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const target = allowedOutboundTarget(url, request.method);
    if (target === null) return blocked(`${request.method} ${url.hostname}${url.pathname}`);
    if (target === "github") return fetch(request);
    const headers = new Headers(request.headers);
    headers.set("x-api-key", this.env.ANTHROPIC_API_KEY);
    if (url.pathname !== "/v1/messages") return fetch(new Request(request, { headers }));
    return this.#meteredMessages(request, headers);
  }

  async #meteredMessages(request: Request, headers: Headers): Promise<Response> {
    const sandbox = this.env.SANDBOX.get(this.env.SANDBOX.idFromString(this.ctx.props.sandboxId));
    if (!(await sandbox.meterAllows())) return blocked("the scan's budget is spent");
    const body = parseMessagesBody(await request.text());
    if (body === null) return blocked("the request is not a messages call");
    const maxTokens = Math.min(body.max_tokens ?? SCAN_SANDBOX_MAX_OUTPUT_TOKENS, SCAN_SANDBOX_MAX_OUTPUT_TOKENS);
    headers.delete("content-length");
    const upstream = await fetch(
      new Request(request.url, { method: "POST", headers, body: JSON.stringify({ ...body, max_tokens: maxTokens }) }),
    );
    if (!upstream.ok || upstream.body === null) return upstream;

    const scanner = createUsageScanner((tokens) => this.ctx.waitUntil(sandbox.meterRecord(body.model, tokens)));
    const decoder = new TextDecoder();
    const counted = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        scanner.feed(decoder.decode(chunk, { stream: true }));
        controller.enqueue(chunk);
      },
      flush() {
        scanner.end();
      },
    });
    return new Response(upstream.body.pipeThrough(counted), upstream);
  }
}
