import { beforeAll, describe, expect, it } from "vitest";
import { tenantFaqs } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { addFaqSvc, listFaqsSvc, updateFaqSvc } from "#/modules/faq";
import { FAQ_LOCATION_NOT_FOUND } from "#/modules/faq/constants";
import { createTestDb, defaultLocationId, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let otherTenantId: string;
let downtownId: string;
let airportId: string;
let otherLocationId: string;

const questionsAt = async (locationId: string) =>
  (await runEffect(listFaqsSvc(db, tenantId, { kind: "location", locationId }))).faqs.map((f) => f.question).toSorted();

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  otherTenantId = await insertTenant(db, "Other", "other");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  otherLocationId = await defaultLocationId(db, otherTenantId);
  await db.insert(tenantFaqs).values([
    { tenantId, question: "Do you take cards?", answer: "Yes." },
    { tenantId, locationId: airportId, question: "Where is the Airport counter?", answer: "Gate 4." },
    { tenantId, locationId: downtownId, question: "Is there street parking?", answer: "Yes." },
  ]);
});

describe("FAQs per Location", () => {
  it("shows Tenant-wide FAQs plus the Location's own", async () => {
    expect(await questionsAt(airportId)).toEqual(["Do you take cards?", "Where is the Airport counter?"]);
    expect(await questionsAt(downtownId)).toEqual(["Do you take cards?", "Is there street parking?"]);
  });

  it("does not show a Location's FAQ at another Location, nor at one created later", async () => {
    const laterId = await insertLocation(db, tenantId, { name: "Harbour", slug: "harbour" });

    expect(await questionsAt(downtownId)).not.toContain("Where is the Airport counter?");
    expect(await questionsAt(laterId)).toEqual(["Do you take cards?"]);
  });

  it("shows only Tenant-wide FAQs when no Location is resolved", async () => {
    const { faqs } = await runEffect(listFaqsSvc(db, tenantId, { kind: "tenantWide" }));

    expect(faqs.map((f) => f.question)).toEqual(["Do you take cards?"]);
  });

  it("lists every FAQ with its Location for the dashboard", async () => {
    const { faqs } = await runEffect(listFaqsSvc(db, tenantId));

    expect(faqs.map((f) => [f.question, f.locationId])).toEqual(
      expect.arrayContaining([
        ["Do you take cards?", null],
        ["Where is the Airport counter?", airportId],
        ["Is there street parking?", downtownId],
      ]),
    );
  });

  it("rejects an FAQ row joining another Tenant's Location", async () => {
    await expect(
      db.insert(tenantFaqs).values({ tenantId, locationId: otherLocationId, question: "Q", answer: "A" }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_faqs_location_in_tenant_fk" } });
  });
});

describe("addFaqSvc and updateFaqSvc with a Location", () => {
  it("adds an FAQ for one Location", async () => {
    const faq = await runEffect(
      addFaqSvc(db, tenantId, { categoryId: null, locationId: airportId, question: "Gate?", answer: "4" }),
    );

    expect(faq.locationId).toBe(airportId);
    expect(await questionsAt(downtownId)).not.toContain("Gate?");
  });

  it("moves an FAQ to all Locations with a null locationId", async () => {
    const { id } = await runEffect(
      addFaqSvc(db, tenantId, { categoryId: null, locationId: airportId, question: "Move me", answer: "ok" }),
    );

    const moved = await runEffect(updateFaqSvc(db, tenantId, id, { locationId: null }));

    expect(moved.locationId).toBeNull();
    expect(await questionsAt(downtownId)).toContain("Move me");
  });

  it("leaves the Location alone when an update does not mention it", async () => {
    const { id } = await runEffect(
      addFaqSvc(db, tenantId, { categoryId: null, locationId: airportId, question: "Stay", answer: "ok" }),
    );

    const edited = await runEffect(updateFaqSvc(db, tenantId, id, { answer: "changed" }));

    expect(edited).toMatchObject({ locationId: airportId, answer: "changed" });
  });

  it("refuses another Tenant's Location", async () => {
    await expect(
      runEffect(addFaqSvc(db, tenantId, { categoryId: null, locationId: otherLocationId, question: "Q", answer: "A" })),
    ).rejects.toEqual(new NotFoundError(FAQ_LOCATION_NOT_FOUND));
  });
});
