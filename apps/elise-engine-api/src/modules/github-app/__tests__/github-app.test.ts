import { describe, expect, it } from "vitest";
import { findRepoInstallation, mintRepoToken } from "#/modules/github-app";
import { createAppJwt } from "#/modules/github-app/utils";
import { decodeBase64UrlJson as decodeJson, makeRsaKey } from "#/__tests__/rsa-key";

const makeConfig = async () => {
  const key = await makeRsaKey();
  return { config: { appId: "12345", privateKey: key.pem }, verify: key.verify };
};

type Seen = { url: string; method: string; authorization: string | null; body: string | null };
const fakeGithub = (reply: Response) => {
  const seen: Seen[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    seen.push({
      url: String(input),
      method: init?.method ?? "GET",
      authorization: new Headers(init?.headers).get("authorization"),
      body: init?.body === undefined ? null : String(init.body),
    });
    return reply.clone();
  };
  return { seen, fetchImpl };
};

describe("createAppJwt", () => {
  it("is an RS256 token of the App, signed with its key, good for under 10 minutes", async () => {
    const { config, verify } = await makeConfig();
    const [header = "", payload = "", signature = ""] = (await createAppJwt(config, 1_000_000)).split(".");
    expect(decodeJson(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodeJson(payload)).toEqual({ iat: 999_940, exp: 1_000_540, iss: "12345" });
    expect(await verify(`${header}.${payload}`, signature)).toBe(true);
  });

  it("refuses a PKCS#1 key with a message that says how to convert it", async () => {
    await expect(createAppJwt({ appId: "1", privateKey: "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----" })).rejects.toThrow("PKCS#8");
  });

  it("accepts a key whose line breaks were stored as \\n", async () => {
    const { config } = await makeConfig();
    const escaped = { ...config, privateKey: config.privateKey.replace(/\n/g, "\\n") };
    await expect(createAppJwt(escaped)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });
});

describe("mintRepoToken", () => {
  it("asks for a read-only token of one repo, signed as the App", async () => {
    const { config } = await makeConfig();
    const github = fakeGithub(Response.json({ token: "ghs_FAKE" }, { status: 201 }));
    await expect(mintRepoToken(config, 42, 7, github.fetchImpl)).resolves.toBe("ghs_FAKE");
    const [call] = github.seen;
    expect(call?.url).toBe("https://api.github.com/app/installations/42/access_tokens");
    expect(call?.method).toBe("POST");
    expect(call?.authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(JSON.parse(call?.body ?? "")).toEqual({ repository_ids: [7], permissions: { contents: "read" } });
  });

  it("fails with the status only when GitHub refuses", async () => {
    const { config } = await makeConfig();
    const github = fakeGithub(Response.json({ message: "Bad credentials" }, { status: 401 }));
    await expect(mintRepoToken(config, 42, 7, github.fetchImpl)).rejects.toThrow("GitHub refused an installation token: 401");
  });

  it("fails when the answer has no token", async () => {
    const { config } = await makeConfig();
    const github = fakeGithub(Response.json({}, { status: 201 }));
    await expect(mintRepoToken(config, 42, 7, github.fetchImpl)).rejects.toThrow("no installation token");
  });
});

describe("findRepoInstallation", () => {
  it("returns the install that covers the repo", async () => {
    const { config } = await makeConfig();
    const github = fakeGithub(Response.json({ id: 42 }));
    await expect(findRepoInstallation(config, "octo", "hello", github.fetchImpl)).resolves.toBe(42);
    expect(github.seen[0]?.url).toBe("https://api.github.com/repos/octo/hello/installation");
  });

  it("returns null when the App is not installed on the repo", async () => {
    const { config } = await makeConfig();
    const github = fakeGithub(Response.json({ message: "Not Found" }, { status: 404 }));
    await expect(findRepoInstallation(config, "octo", "hello", github.fetchImpl)).resolves.toBeNull();
  });

  it("fails on any other status, so an outage is not read as 'not installed'", async () => {
    const { config } = await makeConfig();
    const github = fakeGithub(new Response("oops", { status: 500 }));
    await expect(findRepoInstallation(config, "octo", "hello", github.fetchImpl)).rejects.toThrow("500");
  });
});
