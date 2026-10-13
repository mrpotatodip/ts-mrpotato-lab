const E = "http://localhost:8788", O = "http://localhost:3000";
const si = (await (await fetch(E + "/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: O }, body: JSON.stringify({ email: "owner@sorella.test", password: process.env.SEED_OWNER_PASSWORD }) })).json()) as { token: string };
const h = { Authorization: "Bearer " + si.token, Origin: O };
const t = ((await (await fetch(E + "/tenants", { headers: h })).json()) as { data: Array<{ id: string }> }).data[0]!.id;
const r = await fetch(E + "/unanswered-questions?tenantId=" + t, { headers: h });
const j = (await r.json()) as { data?: { summary: unknown; questions: unknown[] }; error: unknown };
console.log(r.status, JSON.stringify(j.data?.summary), j.data?.questions.length, JSON.stringify(j.data?.questions.slice(0, 2)), JSON.stringify(j.error));
console.log("no login", (await fetch(E + "/unanswered-questions", { headers: { Origin: O } })).status);
console.log("bad id", (await fetch(E + "/unanswered-questions/nope/dismiss?tenantId=" + t, { method: "POST", headers: h })).status);
