import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { partyRoles, partyRoleScopes, tenantFaqs } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { addFaqTool, getBusinessProfileTool, updateBusinessProfileTool, updateFaqTool } from "#/modules/chat-bot/agent-tools";
import { CHAT_BOT_EDITOR_ONLY } from "#/modules/chat-bot/constants";
import type { ChatBotOwner, ChatBotToolSpec } from "#/modules/chat-bot/types";
import {
  createTestDb,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let downtownId: string;
let torontoId: string;
let montrealId: string;
let admin: ChatBotOwner;
let toronto: ChatBotOwner;
let canada: ChatBotOwner;
let unbound: ChatBotOwner;
let staff: ChatBotOwner;

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], who: ChatBotOwner) =>
  Effect.runPromise(tool.execute(input, { db, owner: who }));

const member = async (email: string, role: string, scope: { locationId?: string; countryId?: string } | { locationId?: string; countryId?: string }[] = []) => {
  const login = await insertPersonWithLogin(db, email);
  await insertMember(db, tenantId, login.partyId, role);
  const [partyRole] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, login.partyId));
  for (const one of [scope].flat()) await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: partyRole.id, ...one });
  return { kind: "user", tenantId, userId: login.userId } satisfies ChatBotOwner;
};

const seed = async (scope: { locationId?: string; countryId?: string }) => {
  const [created] = await db
    .insert(tenantFaqs)
    .values({ tenantId, question: "Seeded?", answer: "Yes.", ...scope })
    .returning({ id: tenantFaqs.id });
  return created.id;
};
const seedDowntown = () => seed({ locationId: downtownId });
const row = async (id: string) => (await db.select().from(tenantFaqs).where(eq(tenantFaqs.id, id)))[0];
const faqNamed = async (question: string) => db.select().from(tenantFaqs).where(eq(tenantFaqs.question, question));
const REFUSED = { error: expect.stringContaining("does not cover") };

const noChange = { description: null, websiteUrl: null, phone: null, email: null, address: null };
const newFaq = (question: string, scope: string) => ({ categoryId: null, question, answer: "A.", scope });

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple", "maple");
  downtownId = await defaultLocationId(db, tenantId);
  const caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  montrealId = await insertLocation(db, tenantId, { name: "Montreal", slug: "montreal", countryId: caId });
  admin = await member("admin@m.test", "tenant_admin");
  toronto = await member("toronto@m.test", "store_admin", { locationId: torontoId });
  canada = await member("canada@m.test", "store_admin", { countryId: caId });
  unbound = await member("unbound@m.test", "store_admin");
  staff = await member("staff@m.test", "store_staff", { locationId: torontoId });
});

describe("addFaq for a member bound to Toronto", () => {
  it("is refused at Downtown and writes nothing", async () => {
    expect(await run(addFaqTool, newFaq("Dt add?", downtownId), toronto)).toEqual(REFUSED);
    expect(await faqNamed("Dt add?")).toEqual([]);
  });

  it("is refused for a Country that holds an uncovered Location", async () => {
    expect(await run(addFaqTool, newFaq("Ca add?", "CA"), toronto)).toEqual(REFUSED);
    expect(await faqNamed("Ca add?")).toEqual([]);
  });

  it("succeeds at Toronto, and for the cafe-wide scope", async () => {
    expect(await run(addFaqTool, newFaq("To add?", "Toronto"), toronto)).toHaveProperty("question", "To add?");
    expect(await run(addFaqTool, newFaq("All add?", "all"), toronto)).toHaveProperty("question", "All add?");
  });
});

describe("addFaq for a member bound to Canada", () => {
  it("can scope a FAQ to Canada but not to Downtown", async () => {
    expect(await run(addFaqTool, newFaq("Ca ok?", "CA"), canada)).toHaveProperty("question", "Ca ok?");
    expect(await run(addFaqTool, newFaq("Dt no?", downtownId), canada)).toEqual(REFUSED);
  });
});

describe("updateFaq for a member bound to Toronto", () => {
  it("is refused on a Downtown FAQ and changes nothing", async () => {
    const id = await seedDowntown();
    expect(await run(updateFaqTool, { faqId: id, question: "Changed?", answer: null, scope: null }, toronto)).toEqual(REFUSED);
    expect((await row(id)).question).toBe("Seeded?");
  });

  it("cannot move a Toronto FAQ to Downtown: the new scope must be covered", async () => {
    const id = await seed({ locationId: torontoId });
    expect(await run(updateFaqTool, { faqId: id, question: null, answer: null, scope: downtownId }, toronto)).toEqual(REFUSED);
    expect((await row(id)).locationId).toBe(torontoId);
  });

  it("cannot move a Downtown FAQ to Toronto: the old scope must be covered", async () => {
    const id = await seedDowntown();
    expect(await run(updateFaqTool, { faqId: id, question: null, answer: null, scope: "Toronto" }, toronto)).toEqual(REFUSED);
    expect((await row(id)).locationId).toBe(downtownId);
  });

  it("edits a Toronto FAQ and a cafe-wide one", async () => {
    const at = await seed({ locationId: torontoId });
    expect(await run(updateFaqTool, { faqId: at, question: "Edited?", answer: null, scope: null }, toronto)).toHaveProperty("question", "Edited?");
    const wide = await seed({});
    expect(await run(updateFaqTool, { faqId: wide, question: "Wide?", answer: null, scope: null }, toronto)).toHaveProperty("question", "Wide?");
  });
});

describe("FAQ tools for members the binding does not limit", () => {
  it("lets an unbound member and the tenant admin write FAQs anywhere", async () => {
    const id = await seedDowntown();
    expect(await run(updateFaqTool, { faqId: id, question: "U?", answer: null, scope: null }, unbound)).toHaveProperty("question", "U?");
    expect(await run(addFaqTool, newFaq("Adm?", downtownId), admin)).toHaveProperty("question", "Adm?");
  });

  it("still refuses a non-editor", async () => {
    expect(await run(addFaqTool, newFaq("St?", "Toronto"), staff)).toEqual({ error: CHAT_BOT_EDITOR_ONLY });
  });
});

describe("updateBusinessProfile for a member bound to Toronto", () => {
  it("is refused when it names an uncovered Location, and nothing is written", async () => {
    expect(await run(updateBusinessProfileTool, { ...noChange, phone: "555-0100", locationId: downtownId }, toronto)).toEqual(REFUSED);
    expect(await run(getBusinessProfileTool, { locationId: downtownId }, admin)).toHaveProperty("phone", null);
  });

  it("writes the phone at the covered Location it names", async () => {
    expect(await run(updateBusinessProfileTool, { ...noChange, phone: "555-0101", locationId: "Toronto" }, toronto)).toHaveProperty("phone", "555-0101");
  });

  it("changes the cafe-wide fields without a Location", async () => {
    await run(updateBusinessProfileTool, { ...noChange, description: "Maple cafe" }, toronto);
    expect(await run(getBusinessProfileTool, { locationId: downtownId }, admin)).toHaveProperty("description", "Maple cafe");
  });

  it("asks which covered Location when phone is given and several are covered", async () => {
    const two = await member("two@m.test", "store_admin", [{ locationId: torontoId }, { locationId: montrealId }]);
    expect(await run(updateBusinessProfileTool, { ...noChange, address: "1 King St" }, two)).toMatchObject({ needsLocation: true });
  });

  it("uses the lone covered Location when none is named", async () => {
    expect(await run(updateBusinessProfileTool, { ...noChange, address: "1 King St" }, toronto)).toHaveProperty("address", "1 King St");
  });
});

describe("updateBusinessProfile for members the binding does not limit", () => {
  it("lets the tenant admin write the phone at any Location", async () => {
    expect(await run(updateBusinessProfileTool, { ...noChange, phone: "555-0102", locationId: downtownId }, admin)).toHaveProperty("phone", "555-0102");
  });
});

