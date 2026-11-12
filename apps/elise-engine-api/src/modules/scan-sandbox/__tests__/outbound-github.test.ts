import { afterEach, describe, expect, it, vi } from "vitest";
import { Outbound } from "#/modules/scan-sandbox";
import type { OutboundGithub } from "#/modules/scan-sandbox/types";
import { gitBasicAuth, repoOfGitPath } from "#/modules/scan-sandbox/utils";
import { makeRsaKey } from "#/__tests__/rsa-key";

const TOKEN = "ghs_FAKE_TOKEN_1234";
const GITHUB: OutboundGithub = { installationId: 42, repoId: 7, repo: "octo/hello" };

type Call = { url: string; authorization: string | null; body: string | null };

const stubNetwork = (mintStatus = 201) => {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (input: Request | string, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    calls.push({ url: request.url, authorization: request.headers.get("authorization"), body: init?.body === undefined ? null : String(init.body) });
    if (request.url.startsWith("https://api.github.com/")) return Response.json(mintStatus === 201 ? { token: TOKEN } : { message: "no" }, { status: mintStatus });
    return new Response("pack", { status: 200 });
  });
  return calls;
};

const outbound = (github: OutboundGithub | undefined, env: Record<string, string> = {}) => {
  // SAFETY: the test stub of WorkerEntrypoint takes no arguments; env and ctx are set by hand.
  const instance = Reflect.construct(Outbound, []) as Outbound;
  return Object.assign(instance, { env, ctx: { props: { sandboxId: "box", repo: "octo/hello", github }, waitUntil: () => undefined } });
};

const withApp = async () => ({ GITHUB_APP_ID: "12345", GITHUB_APP_PRIVATE_KEY: (await makeRsaKey()).pem });
const cloneRequest = (path = "octo/hello") => new Request(`https://github.com/${path}/info/refs?service=git-upload-pack`);
const gitHubCalls = (calls: Call[]) => calls.filter((call) => call.url.startsWith("https://github.com/"));

afterEach(() => vi.unstubAllGlobals());

describe("Outbound, a private clone", () => {
  it("signs the clone of its own repo with a token made for that repo alone", async () => {
    const calls = stubNetwork();
    const response = await outbound(GITHUB, await withApp()).fetch(cloneRequest());
    expect(response.status).toBe(200);
    expect(gitHubCalls(calls)[0]?.authorization).toBe(gitBasicAuth(TOKEN));
    const mint = calls.find((call) => call.url.endsWith("/access_tokens"));
    expect(JSON.parse(mint?.body ?? "")).toEqual({ repository_ids: [7], permissions: { contents: "read" } });
  });

  it("matches the repo whatever the case or .git suffix", async () => {
    const calls = stubNetwork();
    await outbound(GITHUB, await withApp()).fetch(cloneRequest("Octo/Hello.git"));
    expect(gitHubCalls(calls)[0]?.authorization).toBe(gitBasicAuth(TOKEN));
  });

  it("refuses any other repo, and does not ask GitHub for a token or reach github.com", async () => {
    const calls = stubNetwork();
    const response = await outbound(GITHUB, await withApp()).fetch(cloneRequest("octo/secrets"));
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("leaves a public clone as it was: no token, no GitHub API call", async () => {
    const calls = stubNetwork();
    await outbound(undefined, await withApp()).fetch(cloneRequest());
    expect(gitHubCalls(calls)[0]?.authorization).toBeNull();
    expect(calls.some((call) => call.url.startsWith("https://api.github.com/"))).toBe(false);
  });

  it("refuses another public repo too, so which repos are asked for cannot carry data out", async () => {
    const calls = stubNetwork();
    const response = await outbound(undefined, await withApp()).fetch(cloneRequest("attacker/byte-4f"));
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("does not touch the container's own request, and the answer it returns holds no token", async () => {
    stubNetwork();
    const request = cloneRequest();
    const response = await outbound(GITHUB, await withApp()).fetch(request);
    expect(request.headers.get("authorization")).toBeNull();
    expect(JSON.stringify([...response.headers])).not.toContain(TOKEN);
    expect(await response.text()).not.toContain(TOKEN);
  });

  it("blocks the clone when GitHub refuses the token, so the scan fails", async () => {
    const calls = stubNetwork(401);
    const response = await outbound(GITHUB, await withApp()).fetch(cloneRequest());
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Blocked: GitHub access failed");
    expect(gitHubCalls(calls)).toHaveLength(0);
  });

  it("blocks the clone when the App is not set up", async () => {
    const calls = stubNetwork();
    const response = await outbound(GITHUB, {}).fetch(cloneRequest());
    expect(response.status).toBe(403);
    expect(gitHubCalls(calls)).toHaveLength(0);
  });
});

describe("git helpers", () => {
  it("names the repo of a git path in the form of a Scan's repo", () => {
    expect(repoOfGitPath("/Octo/Hello.git/info/refs")).toBe("octo/hello");
    expect(repoOfGitPath("/octo/hello/git-upload-pack")).toBe("octo/hello");
  });

  it("builds the Basic header git expects", () => {
    expect(atob(gitBasicAuth("abc").replace("Basic ", ""))).toBe("x-access-token:abc");
  });
});
