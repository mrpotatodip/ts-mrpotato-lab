import { describe, expect, it } from "vitest";
import type { GithubRepo } from "#/modules/github";
import type { KnownRepo } from "#/modules/scan/utils/scan-known-repos";
import { scanRepoLinkPick, scanRepoPickMatches, scanRepoPicks } from "#/modules/scan/utils/scan-repo-picks";

const known = (over: Partial<KnownRepo>): KnownRepo => ({ repoId: "r1", url: "https://github.com/acme/api", label: "acme/api", last: "succeeded", running: false, isPrivate: false, ...over });
const connected = (over: Partial<GithubRepo>): GithubRepo => ({ installationId: "7", fullName: "acme/api", url: "https://github.com/acme/api", private: false, ...over });

describe("scanRepoPicks", () => {
  it("lists a scanned public repository once, with its engine branches", () => {
    const picks = scanRepoPicks([known({})], []);
    expect(picks).toHaveLength(1);
    expect(picks[0]).toMatchObject({ repoId: "r1", connection: null, isPrivate: false, note: "Last scan succeeded" });
  });

  it("merges a scanned repository with the connection that can read it, and takes privacy from the connection", () => {
    const picks = scanRepoPicks([known({})], [connected({ private: true })]);
    expect(picks).toHaveLength(1);
    expect(picks[0]).toMatchObject({ repoId: "r1", isPrivate: true });
    expect(picks[0]?.connection?.installationId).toBe("7");
  });

  it("drops a private scanned repository that no connection can read now", () => {
    expect(scanRepoPicks([known({ isPrivate: true })], [])).toEqual([]);
  });

  it("adds connected repositories that were never scanned after the scanned ones", () => {
    const picks = scanRepoPicks([known({})], [connected({ fullName: "acme/web", url: "https://github.com/acme/web", private: true })]);
    expect(picks.map((item) => item.label)).toEqual(["acme/api", "acme/web"]);
    expect(picks[1]).toMatchObject({ repoId: null, isPrivate: true, running: false });
  });

  it("says a repository with a queued or running scan is running", () => {
    expect(scanRepoPicks([known({ running: true })], [])[0]).toMatchObject({ running: true, note: "A scan is running now" });
  });
});

describe("scanRepoLinkPick", () => {
  it.each([
    ["https://github.com/honojs/hono", "https://github.com/honojs/hono"],
    ["github.com/honojs/hono/", "https://github.com/honojs/hono"],
    ["  http://www.github.com/honojs/hono.git ", "https://github.com/honojs/hono"],
  ])("reads %s as a public repository", (text, url) => {
    expect(scanRepoLinkPick(text)).toMatchObject({ url, label: "honojs/hono", isPrivate: false, fromLink: true });
  });

  it.each(["honojs", "https://gitlab.com/a/b", "https://github.com/a/b/tree/main", ""])("does not read %j as a repository", (text) => {
    expect(scanRepoLinkPick(text)).toBeNull();
  });
});

describe("scanRepoPickMatches", () => {
  const picks = scanRepoPicks([known({}), known({ repoId: "r2", url: "https://github.com/honojs/hono", label: "honojs/hono" })], []);

  it("filters by name, ignoring case", () => {
    expect(scanRepoPickMatches(picks, "HONO").map((item) => item.label)).toEqual(["honojs/hono"]);
  });

  it("offers a pasted link first when the account does not have that repository", () => {
    const matches = scanRepoPickMatches(picks, "https://github.com/colinhacks/zod");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ label: "colinhacks/zod", fromLink: true });
  });

  it("answers a pasted link to a repository the account has with that repository, not a duplicate", () => {
    const matches = scanRepoPickMatches(picks, "https://github.com/HonoJS/hono");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ repoId: "r2", fromLink: false });
  });
});
