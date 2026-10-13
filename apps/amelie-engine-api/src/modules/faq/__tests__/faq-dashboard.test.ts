import { beforeAll, describe, expect, it } from "vitest";
import type { DbConnectType } from "#/lib/db-connection";
import { ConflictError, NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import {
  addFaqCategorySvc,
  addFaqSvc,
  deleteFaqCategorySvc,
  deleteFaqSvc,
  listFaqsSvc,
  renameFaqCategorySvc,
  updateFaqSvc,
} from "#/modules/faq";
import { FAQ_CATEGORY_EXISTS, FAQ_CATEGORY_NOT_FOUND } from "#/modules/faq/constants";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
});

describe("FAQ categories", () => {
  it("adds categories in order and refuses a same name, ignoring case", async () => {
    const parking = await runEffect(addFaqCategorySvc(db, sorellaId, "Parking"));
    await runEffect(addFaqCategorySvc(db, sorellaId, "Kids"));

    await expect(runEffect(addFaqCategorySvc(db, sorellaId, "parking"))).rejects.toEqual(
      new ConflictError(FAQ_CATEGORY_EXISTS),
    );
    const { categories } = await runEffect(listFaqsSvc(db, sorellaId));
    expect(categories.map((c) => c.name)).toEqual(["Parking", "Kids"]);
    expect(parking.name).toBe("Parking");
  });

  it("lets two Tenants use the same name", async () => {
    await runEffect(addFaqCategorySvc(db, otherCafeId, "Parking"));

    const { categories } = await runEffect(listFaqsSvc(db, otherCafeId));

    expect(categories.map((c) => c.name)).toEqual(["Parking"]);
  });

  it("renames a category, keeps its own name valid, and refuses another's name", async () => {
    const { categories } = await runEffect(listFaqsSvc(db, sorellaId));
    const [parking, kids] = categories;

    const renamed = await runEffect(renameFaqCategorySvc(db, sorellaId, parking.id, "PARKING"));

    expect(renamed.name).toBe("PARKING");
    await expect(runEffect(renameFaqCategorySvc(db, sorellaId, parking.id, "kids"))).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(runEffect(renameFaqCategorySvc(db, otherCafeId, kids.id, "Nope"))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("moves an FAQ between categories and back to General, and refuses another Tenant's category", async () => {
    const { categories } = await runEffect(listFaqsSvc(db, sorellaId));
    const faq = await runEffect(addFaqSvc(db, sorellaId, { categoryId: null, question: "Q?", answer: "A." }));

    const moved = await runEffect(updateFaqSvc(db, sorellaId, faq.id, { categoryId: categories[0].id }));
    const back = await runEffect(updateFaqSvc(db, sorellaId, faq.id, { categoryId: null }));

    expect(moved.category).toBe("PARKING");
    expect(back).toMatchObject({ categoryId: null, category: null });
    const otherCategory = (await runEffect(listFaqsSvc(db, otherCafeId))).categories[0];
    await expect(
      runEffect(updateFaqSvc(db, sorellaId, faq.id, { categoryId: otherCategory.id })),
    ).rejects.toEqual(new ValidationError(FAQ_CATEGORY_NOT_FOUND));
  });

  it("deletes a category and moves its FAQs to General", async () => {
    const { categories } = await runEffect(listFaqsSvc(db, sorellaId));
    const kids = categories.find((c) => c.name === "Kids");
    const faq = await runEffect(addFaqSvc(db, sorellaId, { categoryId: kids!.id, question: "High chair?", answer: "Yes." }));

    await runEffect(deleteFaqCategorySvc(db, sorellaId, kids!.id));
    const after = (await runEffect(listFaqsSvc(db, sorellaId))).faqs.find((f) => f.id === faq.id);

    expect(after).toMatchObject({ categoryId: null, category: null });
    await expect(runEffect(deleteFaqCategorySvc(db, sorellaId, kids!.id))).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteFaqSvc", () => {
  it("deletes one FAQ, never another Tenant's", async () => {
    const faq = await runEffect(addFaqSvc(db, sorellaId, { categoryId: null, question: "Wi-Fi?", answer: "Free." }));

    await expect(runEffect(deleteFaqSvc(db, otherCafeId, faq.id))).rejects.toBeInstanceOf(NotFoundError);
    await runEffect(deleteFaqSvc(db, sorellaId, faq.id));

    const { faqs } = await runEffect(listFaqsSvc(db, sorellaId));
    expect(faqs.some((f) => f.id === faq.id)).toBe(false);
    await expect(runEffect(deleteFaqSvc(db, sorellaId, faq.id))).rejects.toBeInstanceOf(NotFoundError);
  });
});
