import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildApp } from "#/index";
import { fakeBindings, TEST_TOKEN, testExecutionContext } from "#/__tests__/fake-bindings";

// -----
// One GET through the real app, in-process, against the database in
// LIVE_DATABASE_URL. The method is fixed, so this cannot write.
// -----
it("GET one route against the live database", async () => {
  const { LIVE_DATABASE_URL: url, LIVE_PATH: path, LIVE_ACCOUNT: account, LIVE_OUT: out } = process.env;
  if (!url || !path || !account || !out) throw new Error("run it through tools/live-get.mjs");
  const { env } = fakeBindings({ DATABASE_URL: url });
  const request = new Request(`http://localhost${path}`, { method: "GET", headers: { authorization: `Bearer ${TEST_TOKEN}`, "x-account-id": account } });
  // SAFETY: the app only reads DATABASE_URL and the bindings that fakeBindings fills.
  const response = await buildApp().app.fetch(request, env as never, testExecutionContext as never);
  writeFileSync(out, JSON.stringify({ status: response.status, body: await response.json() }, null, 2));
  expect(response.status).toBeLessThan(600);
}, 60_000);
