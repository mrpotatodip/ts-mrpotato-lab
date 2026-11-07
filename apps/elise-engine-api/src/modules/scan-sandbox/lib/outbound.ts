import { WorkerEntrypoint } from "cloudflare:workers";
import type { Bindings } from "#/types/variables";
import { allowedOutboundTarget } from "#/modules/scan-sandbox/utils";

const blocked = (reason: string) => new Response(`Blocked: ${reason}`, { status: 403 });

export class Outbound extends WorkerEntrypoint<Bindings> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const target = allowedOutboundTarget(url, request.method);
    if (target === null) return blocked(`${request.method} ${url.hostname}${url.pathname}`);
    if (target === "github") return fetch(request);
    const headers = new Headers(request.headers);
    headers.set("x-api-key", this.env.ANTHROPIC_API_KEY);
    return fetch(new Request(request, { headers }));
  }
}
