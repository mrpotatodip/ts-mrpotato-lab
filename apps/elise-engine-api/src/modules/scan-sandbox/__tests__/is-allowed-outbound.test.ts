import { describe, expect, it } from "vitest";
import { allowedOutboundTarget } from "#/modules/scan-sandbox/utils";

const target = (url: string, method = "GET") => allowedOutboundTarget(new URL(url), method);

describe("allowedOutboundTarget", () => {
  it("allows the git fetch steps of a public repo", () => {
    expect(target("https://github.com/octocat/Hello-World/info/refs?service=git-upload-pack")).toBe("github");
    expect(target("https://github.com/octocat/Hello-World/git-upload-pack", "POST")).toBe("github");
    expect(target("https://github.com/octocat/Hello-World.git/info/refs?service=git-upload-pack")).toBe("github");
  });

  it("blocks a git push", () => {
    expect(target("https://github.com/octocat/Hello-World/git-receive-pack", "POST")).toBeNull();
    expect(target("https://github.com/octocat/Hello-World/info/refs?service=git-receive-pack")).toBeNull();
  });

  it("blocks every other GitHub path and method", () => {
    expect(target("https://github.com/octocat/Hello-World")).toBeNull();
    expect(target("https://github.com/login/oauth/access_token", "POST")).toBeNull();
    expect(target("https://github.com/octocat/Hello-World/issues", "POST")).toBeNull();
    expect(target("https://github.com/octocat/Hello-World/git-upload-pack")).toBeNull();
  });

  it("allows only the Anthropic routes the agent needs", () => {
    expect(target("https://api.anthropic.com/v1/messages", "POST")).toBe("anthropic");
    expect(target("https://api.anthropic.com/v1/messages/count_tokens", "POST")).toBe("anthropic");
    expect(target("https://api.anthropic.com/api/claude_code/settings")).toBe("anthropic");
    expect(target("https://api.anthropic.com/api/claude_code/policy_limits")).toBe("anthropic");
  });

  it("blocks other Anthropic routes, so the injected key cannot be used on them", () => {
    expect(target("https://api.anthropic.com/v1/messages/batches", "POST")).toBeNull();
    expect(target("https://api.anthropic.com/v1/files", "POST")).toBeNull();
    expect(target("https://api.anthropic.com/v1/messages")).toBeNull();
  });

  it("blocks other hosts and plain HTTP", () => {
    expect(target("https://example.com/")).toBeNull();
    expect(target("https://evil.github.com/octocat/x/info/refs?service=git-upload-pack")).toBeNull();
    expect(target("http://github.com/octocat/Hello-World/info/refs?service=git-upload-pack")).toBeNull();
  });
});
