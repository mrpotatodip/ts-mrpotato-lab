import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import type { ChatBotJson, ChatBotToolError } from "@repo/contracts/chat-bots";
import {
  chatBotThreadSessions,
  chatBotThreads,
  tenantBusinessHours,
  tenantBusinessProfiles,
  tenantFaqs,
  tenantLocations,
} from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { ListFaqsResultSchema } from "#/modules/chat-bot/agent-tools/public/list-faqs";
import { getBusinessProfileTool, getOpeningScheduleTool, listFaqsTool } from "#/modules/chat-bot/agent-tools";
import type { ChatBotRuntime, ChatBotToolSpec } from "#/modules/chat-bot/types";
import {
  createTestDb,
  defaultLocationId,
  insertCountry,
  insertLocation,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let usLocationId: string;
let nzLocationId: string;
let usCountryId: string;

const newThread = async (locationId: string) => {
  const [thread] = await db.insert(chatBotThreads).values({}).returning({ id: chatBotThreads.id });
  await db.insert(chatBotThreadSessions).values({
    threadId: thread.id,
    tenantId,
    locationId,
    anonymousId: "anon-1",
    userId: null,
    expiresAt: new Date("2999-01-01"),
  });
  return thread.id;
};

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], threadId: string) => {
  const runtime: ChatBotRuntime = {
    db,
    threadId,
    owner: { kind: "anonymous", tenantId, anonymousId: "anon-1" },
  };
  return Effect.runPromise(tool.execute(input, runtime));
};

const questions = (result: ChatBotJson | ChatBotToolError) =>
  ListFaqsResultSchema.parse(result)
    .faqs.map((faq) => faq.question)
    .toSorted();

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Two Country Cafe", "two-country-chat");
  usLocationId = await defaultLocationId(db, tenantId);
  const [usLocation] = await db
    .select({ countryId: tenantLocations.countryId })
    .from(tenantLocations)
    .where(eq(tenantLocations.id, usLocationId));
  usCountryId = usLocation.countryId;
  const nzId = await insertCountry(db, tenantId, { country: "NZ", currency: "NZD" });
  nzLocationId = await insertLocation(db, tenantId, {
    name: "Britomart CBD",
    slug: "britomart-cbd",
    countryId: nzId,
  });
  await db.insert(tenantBusinessProfiles).values({
    tenantId,
    description: "Café in Fishkill, NY",
    websiteUrl: "https://www.lasorellafishkill.com",
    email: "lasorellafishkill@gmail.com",
  });
  await db.insert(tenantBusinessHours).values({
    tenantId,
    locationId: usLocationId,
    dayOfWeek: 6,
    opensAt: "08:00",
    closesAt: "16:00",
  });
  await db.insert(tenantFaqs).values([
    { tenantId, question: "Sister restaurant?", answer: "Il Figlio Enoteca." },
    {
      tenantId,
      countryId: usCountryId,
      question: "Do you sell gift cards?",
      answer: "Yes, on lasorellafishkill.com.",
    },
    {
      tenantId,
      countryId: usCountryId,
      question: "Can I order online?",
      answer: "Yes, through the Online ordering link on lasorellafishkill.com.",
    },
  ]);
});

describe("getBusinessProfile on a two-Country Tenant", () => {
  it("keeps Tenant-wide email and website on the first Country's Location", async () => {
    expect(await run(getBusinessProfileTool, {}, await newThread(usLocationId))).toMatchObject({
      email: "lasorellafishkill@gmail.com",
      websiteUrl: "https://www.lasorellafishkill.com",
      location: { id: usLocationId, name: "Two Country Cafe" },
      country: { code: "US", name: "United States" },
    });
  });

  it("does not give another Country's Location the first Country's email and website", async () => {
    expect(await run(getBusinessProfileTool, {}, await newThread(nzLocationId))).toMatchObject({
      email: null,
      websiteUrl: null,
      description: null,
      address: null,
      phone: null,
      location: { id: nzLocationId, name: "Britomart CBD" },
      country: { code: "NZ", name: "New Zealand" },
    });
  });
});

describe("listFaqs on a two-Country Tenant", () => {
  it("keeps a Country-scoped FAQ at the first Country's Location", async () => {
    expect(questions(await run(listFaqsTool, {}, await newThread(usLocationId)))).toEqual([
      "Can I order online?",
      "Do you sell gift cards?",
      "Sister restaurant?",
    ]);
  });

  it("hides a first-Country FAQ at another Country's Location", async () => {
    expect(questions(await run(listFaqsTool, {}, await newThread(nzLocationId)))).toEqual(["Sister restaurant?"]);
  });

  it("returns only the matching café-wide FAQ for a topic", async () => {
    const result = ListFaqsResultSchema.parse(
      await run(listFaqsTool, { topic: "Do you have a sister restaurant?" }, await newThread(nzLocationId)),
    );

    expect(result.faqs).toEqual([
      expect.objectContaining({ question: "Sister restaurant?", answer: "Il Figlio Enoteca." }),
    ]);
    expect(result.note).toMatch(/copy the answer/i);
  });

  it("does not treat a US-only FAQ as a no at an NZ Location", async () => {
    const result = ListFaqsResultSchema.parse(
      await run(listFaqsTool, { topic: "Can I order online?" }, await newThread(nzLocationId)),
    );

    expect(result.faqs).toEqual([]);
    expect(result.note).toMatch(/United States/i);
    expect(result.note).toMatch(/not a/i);
  });

  it("says there is no FAQ when nothing matches anywhere", async () => {
    const result = ListFaqsResultSchema.parse(
      await run(listFaqsTool, { topic: "Can I bring my dog inside?" }, await newThread(nzLocationId)),
    );

    expect(result.faqs).toEqual([]);
    expect(result.note).toMatch(/do not invent/i);
  });
});

describe("getOpeningSchedule on a two-Country Tenant", () => {
  it("returns the first Country's hours at its Location", async () => {
    expect(await run(getOpeningScheduleTool, {}, await newThread(usLocationId))).toHaveProperty(
      "weekly.6.opensAt",
      "08:00",
    );
  });

  it("does not copy those hours onto another Country's Location", async () => {
    expect(await run(getOpeningScheduleTool, {}, await newThread(nzLocationId))).toHaveProperty(
      "weekly.6.opensAt",
      null,
    );
  });
});
