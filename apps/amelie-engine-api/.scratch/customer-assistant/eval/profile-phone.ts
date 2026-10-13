const E = "http://localhost:8788", O = "http://localhost:3000";
const si = (await (await fetch(E + "/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: O }, body: JSON.stringify({ email: "owner@sorella.test", password: process.env.SEED_OWNER_PASSWORD }) })).json()) as { token: string };
const h = { Authorization: "Bearer " + si.token, Origin: O, "Content-Type": "application/json" };
const t = ((await (await fetch(E + "/tenants", { headers: h })).json()) as { data: Array<{ id: string }> }).data[0]!.id;
const get = async () => ((await (await fetch(`${E}/business-profile?tenantId=${t}`, { headers: h })).json()) as { data: Record<string, unknown> }).data;
const before = await get();
console.log("phone now:", before.phone);
if (process.argv[2] === "restore") {
  await fetch(`${E}/business-profile?tenantId=${t}`, { method: "PUT", headers: h, body: JSON.stringify({ ...before, phone: "845-871-2010" }) });
  console.log("restored:", (await get()).phone);
}
