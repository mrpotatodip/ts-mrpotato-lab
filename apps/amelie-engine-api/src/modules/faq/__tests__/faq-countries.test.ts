import { beforeAll, describe, expect, it } from "vitest";
import { tenantFaqs } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { addFaqSvc, listFaqsSvc, updateFaqSvc } from "#/modules/faq";
import { FAQ_COUNTRY_AND_LOCATION, FAQ_COUNTRY_NOT_FOUND } from "#/modules/faq/constants";
import { createTestDb, defaultLocationId, insertCountry, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

// -----
// A café with US (Seattle) and CA (Toronto, Montreal).
// -----
let db: DbConnectType;
let tenantId: string;
let caId: string;
let archivedId: string;
let foreignId: string;
let seattleId: string;
let torontoId: string;
let montrealId: string;

const questionsAt = async (locationId: string) =>
  (await runEffect(listFaqsSvc(db, tenantId, { kind: "location", locationId }))).faqs.map((f) => f.question).toSorted();

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple", "maple");
  seattleId = await defaultLocationId(db, tenantId);
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  archivedId = await insertCountry(db, tenantId, { country: "JP", currency: "JPY", archivedAt: new Date() });
  foreignId = await insertCountry(db, await insertTenant(db, "Other", "other"), { country: "FR", currency: "EUR" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  montrealId = await insertLocation(db, tenantId, { name: "Montreal", slug: "montreal", countryId: caId });
  await db.insert(tenantFaqs).values([
    { tenantId, question: "Do you take cards?", answer: "Yes." },
    { tenantId, countryId: caId, question: "Do you accept Interac?", answer: "Yes." },
    { tenantId, locationId: torontoId, question: "Toronto parking?", answer: "Lot." },
  ]);
});

describe("FAQs per Country", () => {
  it("shows a Country FAQ at every Location in it and never at another Country's", async () => {
    expect(await questionsAt(torontoId)).toEqual(["Do you accept Interac?", "Do you take cards?", "Toronto parking?"]);
    expect(await questionsAt(montrealId)).toEqual(["Do you accept Interac?", "Do you take cards?"]);
    expect(await questionsAt(seattleId)).toEqual(["Do you take cards?"]);
  });

  it("reads a Country scope as cafe-wide plus that Country's", async () => {
    const { faqs } = await runEffect(listFaqsSvc(db, tenantId, { kind: "country", countryId: caId }));

    expect(faqs.map((f) => f.question).toSorted()).toEqual(["Do you accept Interac?", "Do you take cards?"]);
  });

  it("lists the Country on each FAQ for the dashboard", async () => {
    const { faqs } = await runEffect(listFaqsSvc(db, tenantId));

    expect(faqs.find((f) => f.question === "Do you accept Interac?")).toMatchObject({ countryId: caId, locationId: null });
  });
});

describe("addFaqSvc and updateFaqSvc with a Country", () => {
  const base = { categoryId: null, question: "Q?", answer: "A." };

  it("adds an FAQ for one Country", async () => {
    const faq = await runEffect(addFaqSvc(db, tenantId, { ...base, countryId: caId }));

    expect(faq).toMatchObject({ countryId: caId, locationId: null });
  });

  it("refuses both a Country and a Location with a clear message", async () => {
    await expect(
      runEffect(addFaqSvc(db, tenantId, { ...base, countryId: caId, locationId: torontoId })),
    ).rejects.toEqual(new ValidationError(FAQ_COUNTRY_AND_LOCATION));
  });

  it("refuses an archived or another cafe's Country", async () => {
    for (const countryId of [archivedId, foreignId]) {
      await expect(runEffect(addFaqSvc(db, tenantId, { ...base, countryId }))).rejects.toEqual(
        new NotFoundError(FAQ_COUNTRY_NOT_FOUND),
      );
    }
  });

  it("moves an FAQ between a Location, a Country and all", async () => {
    const { id } = await runEffect(addFaqSvc(db, tenantId, { ...base, locationId: torontoId }));

    const toCountry = await runEffect(updateFaqSvc(db, tenantId, id, { countryId: caId, locationId: null }));
    expect(toCountry).toMatchObject({ countryId: caId, locationId: null });
    const toAll = await runEffect(updateFaqSvc(db, tenantId, id, { countryId: null }));
    expect(toAll).toMatchObject({ countryId: null, locationId: null });
  });

  it("refuses an update that would leave both set, and an update to a bad Country", async () => {
    const { id } = await runEffect(addFaqSvc(db, tenantId, { ...base, locationId: torontoId }));

    await expect(runEffect(updateFaqSvc(db, tenantId, id, { countryId: caId }))).rejects.toEqual(
      new ValidationError(FAQ_COUNTRY_AND_LOCATION),
    );
    await expect(runEffect(updateFaqSvc(db, tenantId, id, { countryId: foreignId, locationId: null }))).rejects.toEqual(
      new NotFoundError(FAQ_COUNTRY_NOT_FOUND),
    );
  });
});
