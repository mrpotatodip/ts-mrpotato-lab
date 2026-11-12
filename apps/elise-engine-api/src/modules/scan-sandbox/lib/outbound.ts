import { WorkerEntrypoint } from "cloudflare:workers";
import type { Bindings } from "#/types/variables";
import { ANTHROPIC_KEY_UNREADABLE, openKey } from "#/modules/anthropic-key";
import { mintRepoToken } from "#/modules/github-app";
import { SCAN_SANDBOX_MAX_OUTPUT_TOKENS } from "#/modules/scan-sandbox/constants";
import type { OutboundProps } from "#/modules/scan-sandbox/types";
import {
  allowedOutboundTarget,
  createUsageScanner,
  gitBasicAuth,
  MessagesBodySchema,
  messagesBlockedReason,
  repoOfGitPath,
  reserveUsd,
  safeBetaHeader,
} from "#/modules/scan-sandbox/utils";

const BUDGET_REFUSED = "the scan's budget is spent, or the calls still running may use what is left";
const blocked = (reason: string) => new Response(`Blocked: ${reason}`, { status: 403 });

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
    if (target === "github") return this.#github(request, url);
    const apiKey = await this.#anthropicKey();
    if (apiKey === null) return blocked(ANTHROPIC_KEY_UNREADABLE);
    const headers = new Headers(request.headers);
    headers.set("x-api-key", apiKey);
    if (url.pathname !== "/v1/messages") return fetch(new Request(request, { headers }));
    return this.#meteredMessages(request, headers);
  }

  // -----
  // The platform's key, unless the account brought its own. A key
  // that will not open is never swapped for the platform's: the
  // account chose to pay for its scans, so the scan stops.
  // -----
  async #anthropicKey(): Promise<string | null> {
    const own = this.ctx.props.anthropicKey;
    if (own === undefined) return this.env.ANTHROPIC_API_KEY;
    const { KEY_ENCRYPTION_SECRET: secret } = this.env;
    return secret === undefined ? null : openKey(secret, own.accountId, own.sealed);
  }

  // -----
  // Git may read the one repo this scan was set up for, and no
  // other: a request for another repo is a way to send data out in
  // which repos are asked for. The key is added here, outside the
  // container, and only for a private scan's repo.
  // -----
  async #github(request: Request, url: URL): Promise<Response> {
    const { github, repo } = this.ctx.props;
    if (repoOfGitPath(url.pathname) !== repo) return blocked(`${request.method} ${url.hostname}${url.pathname} is not this scan's repo`);
    if (github === undefined) return fetch(request);
    const { GITHUB_APP_ID: appId, GITHUB_APP_PRIVATE_KEY: privateKey } = this.env;
    if (appId === undefined || privateKey === undefined) return blocked("the GitHub App is not set up");
    try {
      const token = await mintRepoToken({ appId, privateKey }, github.installationId, github.repoId);
      const headers = new Headers(request.headers);
      headers.set("authorization", gitBasicAuth(token));
      return await fetch(new Request(request, { headers }));
    } catch (error) {
      console.error("github token failed", error instanceof Error ? error.message : "unknown");
      return blocked("GitHub access failed");
    }
  }

  async #meteredMessages(request: Request, headers: Headers): Promise<Response> {
    const sandbox = this.env.SANDBOX.get(this.env.SANDBOX.idFromString(this.ctx.props.sandboxId));
    const body = parseMessagesBody(await request.text());
    if (body === null) return blocked("the request is not a messages call");
    const refused = messagesBlockedReason(body);
    if (refused !== null) return blocked(refused);
    const beta = safeBetaHeader(headers.get("anthropic-beta"));
    if (beta === null) headers.delete("anthropic-beta");
    else headers.set("anthropic-beta", beta);
    const maxTokens = Math.min(body.max_tokens ?? SCAN_SANDBOX_MAX_OUTPUT_TOKENS, SCAN_SANDBOX_MAX_OUTPUT_TOKENS);
    headers.delete("content-length");

    // -----
    // The reserve is held until the call ends: a failed fetch, an
    // answer that is not a stream, the end of the stream or a
    // reader that walks away. Records and the release run in one
    // line, so the release never lands before the last record.
    // -----
    const reserved = reserveUsd(body.model, maxTokens);
    if (!(await sandbox.meterReserve(reserved))) return blocked(BUDGET_REFUSED);
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (work: () => Promise<void>) => {
      queue = queue.then(work).catch(() => console.error("meter update failed"));
      this.ctx.waitUntil(queue);
    };
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      enqueue(() => sandbox.meterRelease(reserved));
    };

    let upstream: Response;
    try {
      upstream = await fetch(new Request(request.url, { method: "POST", headers, body: JSON.stringify({ ...body, max_tokens: maxTokens }) }));
    } catch (error) {
      release();
      throw error;
    }
    if (!upstream.ok || upstream.body === null) {
      release();
      return upstream;
    }

    const scanner = createUsageScanner((tokens) => enqueue(() => sandbox.meterRecord(body.model, tokens)));
    const decoder = new TextDecoder();
    const counted = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        scanner.feed(decoder.decode(chunk, { stream: true }));
        controller.enqueue(chunk);
      },
      flush() {
        scanner.end();
        release();
      },
      cancel() {
        scanner.end();
        release();
      },
    });
    return new Response(upstream.body.pipeThrough(counted), upstream);
  }
}
