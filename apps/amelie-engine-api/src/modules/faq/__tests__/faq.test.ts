import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { tenantFaqCategories, tenantFaqs } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { addFaqSvc, listFaqsSvc, updateFaqSvc } from "#/modules/faq";
import { FAQ_CATEGORY_NOT_FOUND } from "#/modules/faq/constants";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let parkingCategoryId: string;
let cardsFaqId: string;

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  const [parking] = await db
    .insert(tenantFaqCategories)
    .values({ tenantId: sorellaId, name: "Parking & access" })
    .returning();
  parkingCategoryId = parking.id;
  const [cards] = await db
    .insert(tenantFaqs)
    .values([
      { tenantId: sorellaId, question: "Do you take cards?", answer: "Yes." },
      { tenantId: sorellaId, categoryId: parking.id, question: "Is there parking?", answer: "Free street parking." },
    ])
    .returning();
  cardsFaqId = cards.id;
});

describe("listFaqsSvc", () => {
  it("lists General first, then each category, with the Tenant's categories", async () => {
    const { categories, faqs } = await runEffect(listFaqsSvc(db, sorellaId));

    expect(categories).toEqual([{ id: parkingCategoryId, name: "Parking & access" }]);
    expect(faqs.map((f) => [f.category, f.question])).toEqual([
      [null, "Do you take cards?"],
      ["Parking & access", "Is there parking?"],
    ]);
  });

  it("never returns another Tenant's FAQs", async () => {
    expect(await runEffect(listFaqsSvc(db, otherCafeId))).toEqual({ categories: [], faqs: [] });
  });
});

describe("faq cross-Tenant references", () => {
  it("rejects an FAQ in another Tenant's category", async () => {
    await expect(
      db
        .insert(tenantFaqs)
        .values({ tenantId: otherCafeId, categoryId: parkingCategoryId, question: "Q", answer: "A" }),
    ).rejects.toMatchObject({ cause: { constraint: "tenant_faqs_category_in_tenant_fk" } });
  });

  it("moves FAQs to General when their category is deleted", async () => {
    const [temporary] = await db
      .insert(tenantFaqCategories)
      .values({ tenantId: sorellaId, name: "Temporary" })
      .returning();
    const [faq] = await db
      .insert(tenantFaqs)
      .values({ tenantId: sorellaId, categoryId: temporary.id, question: "Kids menu?", answer: "Ask us." })
      .returning();

    await db.delete(tenantFaqCategories).where(eq(tenantFaqCategories.id, temporary.id));
    const [after] = await db.select().from(tenantFaqs).where(eq(tenantFaqs.id, faq.id));

    expect(after).toMatchObject({ tenantId: sorellaId, categoryId: null });
    await db.delete(tenantFaqs).where(eq(tenantFaqs.id, faq.id));
  });
});

describe("addFaqSvc", () => {
  it("adds an FAQ in one of the Tenant's categories", async () => {
    const faq = await runEffect(
      addFaqSvc(db, sorellaId, { categoryId: parkingCategoryId, question: "Bike racks?", answer: "Out front." }),
    );

    expect(faq).toMatchObject({ category: "Parking & access", question: "Bike racks?", answer: "Out front." });
    await db.delete(tenantFaqs).where(eq(tenantFaqs.id, faq.id));
  });

  it("refuses another Tenant's category with a clear reason", async () => {
    await expect(
      runEffect(addFaqSvc(db, otherCafeId, { categoryId: parkingCategoryId, question: "Q", answer: "A" })),
    ).rejects.toEqual(new ValidationError(FAQ_CATEGORY_NOT_FOUND));
  });
});

describe("updateFaqSvc", () => {
  it("changes only the parts passed", async () => {
    const faq = await runEffect(updateFaqSvc(db, sorellaId, cardsFaqId, { answer: "Yes, and Apple Pay." }));

    expect(faq).toMatchObject({ question: "Do you take cards?", answer: "Yes, and Apple Pay." });
  });

  it("never changes another Tenant's FAQ", async () => {
    await expect(runEffect(updateFaqSvc(db, otherCafeId, cardsFaqId, { answer: "No." }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
