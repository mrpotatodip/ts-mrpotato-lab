import { readFileSync } from "node:fs";
const E = "http://localhost:8788", O = "http://localhost:3000";
const si = (await (await fetch(E + "/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: O }, body: JSON.stringify({ email: "owner@sorella.test", password: process.env.SEED_OWNER_PASSWORD }) })).json()) as { token: string };
const h = { Authorization: "Bearer " + si.token, Origin: O };
const t = ((await (await fetch(E + "/tenants", { headers: h })).json()) as { data: Array<{ id: string }> }).data[0]!.id;
const form = new FormData();
form.append("files", new File([readFileSync(process.argv[2]!)], "sample-menu.jpg", { type: "image/jpeg" }));
const created = await fetch(`${E}/imports?tenantId=${t}`, { method: "POST", headers: h, body: form });
const c = (await created.json()) as { data?: { id: string; status: string }; error?: unknown };
console.log("create", created.status, JSON.stringify(c.data ?? c.error));
const id = c.data!.id;
type Draft = { kind: string; status: string; reviewNote: string | null; data: Record<string, unknown> };
let detail: { status: string; error: string | null; drafts: Draft[] } | null = null;
for (let i = 0; i < 90; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  detail = ((await (await fetch(`${E}/imports/${id}?tenantId=${t}`, { headers: h })).json()) as { data: typeof detail }).data;
  if (detail && detail.status !== "running") break;
}
console.log("status", detail?.status, detail?.error ?? "");
for (const d of detail?.drafts ?? []) console.log(`${d.kind.padEnd(16)} ${JSON.stringify(d.data).slice(0, 150)}${d.reviewNote ? "  NOTE: " + d.reviewNote : ""}`);
console.log("list", (await (await fetch(`${E}/imports?tenantId=${t}`, { headers: h })).json() as { data: unknown[] }).data.length);
console.log("no login", (await fetch(`${E}/imports?tenantId=${t}`, { headers: { Origin: O } })).status);
