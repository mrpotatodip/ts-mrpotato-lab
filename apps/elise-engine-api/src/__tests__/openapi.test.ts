import { describe, expect, it } from "vitest";
import app from "#/index";

const request = (environment: string, path = "/openapi.json") =>
  // SAFETY: the spec routes read only ENVIRONMENT.
  app.fetch(new Request(`http://localhost${path}`), { ENVIRONMENT: environment } as never);

type Operation = { summary?: string; description?: string; tags?: string[]; security?: Record<string, string[]>[] };
type Spec = { openapi: string; paths: Record<string, Record<string, Operation>> };

const operations = (spec: Spec) =>
  Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({ route: `${method.toUpperCase()} ${path}`, operation })),
  );

// -----
// Opened by the invitee, who has no login yet.
// -----
const PUBLIC_INVITE_ROUTES: ReadonlySet<string> = new Set(["GET /team/invites/{token}", "POST /team/invites/{token}/accept"]);

describe("GET /openapi.json", () => {
  it("lists every route of the API", async () => {
    const spec: Spec = await (await request("development")).json();

    expect(spec.openapi).toBe("3.1.0");
    expect(operations(spec).map(({ route }) => route).toSorted()).toEqual([
      "DELETE /groups/{groupId}",
      "DELETE /groups/{groupId}/members/{partyId}",
      "DELETE /team/invites/{inviteId}",
      "GET /files",
      "GET /findings",
      "GET /groups",
      "GET /me",
      "GET /repos",
      "GET /repos/{repoId}",
      "GET /repos/{repoId}/findings",
      "GET /repos/{repoId}/verdict",
      "GET /scans",
      "GET /scans/{scanId}",
      "GET /scans/{scanId}/diff",
      "GET /scans/{scanId}/files/{file}",
      "GET /team",
      "GET /team/invites/{token}",
      "GET /team/roles",
      "GET /usage",
      "PATCH /groups/{groupId}",
      "POST /groups",
      "POST /repos",
      "POST /repos/{repoId}/branches",
      "POST /scans",
      "POST /sign-up",
      "POST /team/invites",
      "POST /team/invites/{token}/accept",
      "PUT /findings/triage",
      "PUT /groups/{groupId}/members/{partyId}",
    ]);
  });

  it("gives every route a summary, a description, a tag and the bearer scheme", async () => {
    const spec: Spec = await (await request("development")).json();

    for (const { route, operation } of operations(spec)) {
      expect({ route, summary: Boolean(operation.summary) }).toEqual({ route, summary: true });
      expect({ route, description: operation.description?.includes("**Context.**") }).toEqual({ route, description: true });
      const tag = ["groups", "team", "repos", "scans", "files", "findings", "usage", "me", "sign-up"].find((name) => route.includes(`/${name}`));
      expect({ route, tags: operation.tags }).toEqual({ route, tags: [tag] });
      const security = tag === "sign-up" || PUBLIC_INVITE_ROUTES.has(route) ? undefined : [{ bearerAuth: [] }];
      expect({ route, security: operation.security }).toEqual({ route, security });
    }
  });

  it.each(["production", ""])("answers 404 when ENVIRONMENT is %j", async (environment) => {
    expect((await request(environment)).status).toBe(404);
    expect((await request(environment, "/docs")).status).toBe(404);
  });
});
