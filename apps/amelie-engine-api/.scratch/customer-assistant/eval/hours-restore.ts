const E = "http://localhost:8788", O = "http://localhost:3000";
const si = (await (await fetch(E + "/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: O }, body: JSON.stringify({ email: "owner@sorella.test", password: process.env.SEED_OWNER_PASSWORD }) })).json()) as { token: string };
const h = { Authorization: "Bearer " + si.token, Origin: O, "Content-Type": "application/json" };
const t = ((await (await fetch(E + "/tenants", { headers: h })).json()) as { data: Array<{ id: string }> }).data[0]!.id;
const res = await fetch(`${E}/schedule/hours/2?tenantId=${t}`, { method: "PUT", headers: h, body: JSON.stringify({ isClosed: false, opensAt: "08:00", closesAt: "16:00" }) });
console.log(res.status, JSON.stringify(((await res.json()) as { data: unknown }).data));
