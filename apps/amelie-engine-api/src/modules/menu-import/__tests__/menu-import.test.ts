import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { imports, menuItemPrices, tenantBusinessHours, tenantCountries, tenantLocations } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { ConflictError, NotFoundError, ValidationError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { addMenuCategorySvc, addMenuItemImagesSvc, addMenuItemSvc, getMenuEditorSvc, listMenuSvc } from "#/modules/menu";
import { getBusinessProfileSvc, updateBusinessProfileSvc } from "#/modules/business-profile";
import {
  approveAllImportDraftsSvc,
  createImportSvc,
  getImportSvc,
  listImportsSvc,
  publishImportSvc,
  runImportSvc,
  updateImportDraftSvc,
} from "#/modules/menu-import";
import { IMPORT_NOT_READY } from "#/modules/menu-import/constants";
import type { DraftRecord, ImportQueueMessage, ImportRuntime, UploadedFile } from "#/modules/menu-import/types";
import { createTestDb, defaultLocationId, insertCountry, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;

const stored = new Map<string, ArrayBuffer>();
const sent: ImportQueueMessage[] = [];
let extraction: () => Promise<DraftRecord[]>;
let storageFails = false;

const runtime = (): ImportRuntime => ({
  db,
  storage: {
    put: async (key, bytes) => {
      if (storageFails) throw new Error("R2 is down");
      stored.set(key, bytes);
    },
    get: async (key) => stored.get(key) ?? null,
    delete: async (key) => {
      stored.delete(key);
    },
  },
  queue: { send: async (message) => void sent.push(message) },
  extract: () => extraction(),
});

const file = (name: string, contentType = "image/jpeg", size = 4): UploadedFile => ({
  name,
  contentType,
  bytes: new ArrayBuffer(size),
});

const MENU: DraftRecord[] = [
  { kind: "menu_category", data: { name: "Coffee", note: "All drinks come in two sizes" }, reviewNote: null },
  {
    kind: "menu_item",
    data: { categoryName: "Coffee", name: "Latte", description: null, price: null, variants: [{ name: "Small", price: "4.75" }, { name: "Large", price: "6.25" }], dietaryTags: [] },
    reviewNote: null,
  },
  {
    kind: "menu_item",
    data: { categoryName: "Pastries", name: "Muffin", description: "Baked daily", price: "4.00", variants: null, dietaryTags: [] },
    reviewNote: "The price was not clear.",
  },
  { kind: "business_hours", data: { dayOfWeek: 1, isClosed: false, opensAt: "08:00", closesAt: "16:00" }, reviewNote: null },
  {
    kind: "business_profile",
    data: { description: null, websiteUrl: null, phone: "845-871-2010", email: "hello@sorella.test", address: null },
    reviewNote: null,
  },
];

// -----
// A ready Import with the sample drafts, as the queue
// consumer would leave it.
// -----
const readyImport = async (tenantId = sorellaId) => {
  extraction = async () => MENU;
  const created = await runEffect(createImportSvc(runtime(), tenantId, [file("menu.jpg")]));
  await runEffect(runImportSvc(runtime(), { tenantId, importId: created.id }));
  return created.id;
};

const menuNames = async (tenantId = sorellaId) =>
  (await runEffect(getMenuEditorSvc(db, tenantId))).categories.map((c) => [c.name, c.items.map((i) => i.name)]);

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
});

describe("creating an Import", () => {
  it("stores the files under the Tenant's own prefix and sends one queue message", async () => {
    sent.length = 0;

    const created = await runEffect(createImportSvc(runtime(), sorellaId, [file("page 1.jpg"), file("page2.png", "image/png")]));

    expect(created).toMatchObject({ status: "running", files: [{ name: "page 1.jpg" }, { name: "page2.png" }] });
    const keys = [...stored.keys()].filter((key) => key.includes(created.id));
    expect(keys).toHaveLength(2);
    expect(keys.every((key) => key.startsWith(`imports/${sorellaId}/${created.id}/`))).toBe(true);
    expect(sent).toEqual([{ tenantId: sorellaId, importId: created.id }]);
  });

  it("refuses no files, a wrong type, a big file, a PDF with an image, and 11 images", async () => {
    const refuse = (files: UploadedFile[]) => runEffect(createImportSvc(runtime(), sorellaId, files));

    await expect(refuse([])).rejects.toBeInstanceOf(ValidationError);
    await expect(refuse([file("a.gif", "image/gif")])).rejects.toBeInstanceOf(ValidationError);
    await expect(refuse([file("a.jpg", "image/jpeg", 10 * 1024 * 1024 + 1)])).rejects.toBeInstanceOf(ValidationError);
    await expect(refuse([file("a.pdf", "application/pdf"), file("b.jpg")])).rejects.toBeInstanceOf(ValidationError);
    await expect(refuse(Array.from({ length: 11 }, (_, i) => file(`${i}.jpg`)))).rejects.toBeInstanceOf(ValidationError);
    await expect(refuse([file("a.pdf", "application/pdf")])).resolves.toMatchObject({ status: "running" });
  });

  it("keeps the Import but marks it failed when storing fails", async () => {
    storageFails = true;

    const created = await runEffect(createImportSvc(runtime(), sorellaId, [file("menu.jpg")]));
    storageFails = false;

    expect(created.status).toBe("failed");
    expect(created.error).toContain("could not be saved");
  });
});

describe("extracting an Import", () => {
  it("writes the drafts in order and the Import becomes ready", async () => {
    const id = await readyImport();

    const detail = await runEffect(getImportSvc(db, sorellaId, id));

    expect(detail.status).toBe("ready");
    expect(detail.drafts.map((d) => d.kind)).toEqual(["menu_category", "menu_item", "menu_item", "business_hours", "business_profile"]);
    expect(detail.drafts.every((d) => d.status === "pending" && d.sourceFile === "menu.jpg")).toBe(true);
    expect(detail.drafts[2].reviewNote).toBe("The price was not clear.");
    expect(detail.pendingCount).toBe(5);
  });

  it("marks the Import failed with the reason when the extractor fails, and when a file is missing", async () => {
    extraction = async () => {
      throw new Error("the model answered 500");
    };
    const first = await runEffect(createImportSvc(runtime(), sorellaId, [file("menu.jpg")]));
    await runEffect(runImportSvc(runtime(), { tenantId: sorellaId, importId: first.id }));

    const second = await runEffect(createImportSvc(runtime(), sorellaId, [file("menu2.jpg")]));
    stored.clear();
    extraction = async () => MENU;
    await runEffect(runImportSvc(runtime(), { tenantId: sorellaId, importId: second.id }));

    const a = await runEffect(getImportSvc(db, sorellaId, first.id));
    const b = await runEffect(getImportSvc(db, sorellaId, second.id));
    expect(a).toMatchObject({ status: "failed", error: "the model answered 500", drafts: [] });
    expect(b).toMatchObject({ status: "failed", drafts: [] });
  });

  it("does nothing when the queue delivers a finished Import again", async () => {
    const id = await readyImport();
    extraction = async () => [];

    await runEffect(runImportSvc(runtime(), { tenantId: sorellaId, importId: id }));

    expect((await runEffect(getImportSvc(db, sorellaId, id))).drafts).toHaveLength(5);
  });

  it("never shows or touches another Tenant's Import", async () => {
    const id = await readyImport();
    const [draft] = (await runEffect(getImportSvc(db, sorellaId, id))).drafts;

    await expect(runEffect(getImportSvc(db, otherCafeId, id))).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      runEffect(updateImportDraftSvc(db, otherCafeId, id, draft.id, { status: "approved" })),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(publishImportSvc(db, runtime().storage, otherCafeId, id, "add"))).rejects.toBeInstanceOf(NotFoundError);
    expect((await runEffect(listImportsSvc(db, otherCafeId))).some((i) => i.id === id)).toBe(false);
  });
});

describe("reviewing drafts", () => {
  it("edits a draft with its kind's rules, approves, discards, and approves the rest", async () => {
    const id = await readyImport();
    const { drafts } = await runEffect(getImportSvc(db, sorellaId, id));
    const muffin = drafts[2];

    const edited = await runEffect(
      updateImportDraftSvc(db, sorellaId, id, muffin.id, {
        data: { ...muffin.data, price: "4.25" },
        status: "approved",
      }),
    );
    await expect(
      runEffect(updateImportDraftSvc(db, sorellaId, id, muffin.id, { data: { ...muffin.data, price: "4.255" } })),
    ).rejects.toBeInstanceOf(ValidationError);
    await runEffect(updateImportDraftSvc(db, sorellaId, id, drafts[3].id, { status: "discarded" }));
    const all = await runEffect(approveAllImportDraftsSvc(db, sorellaId, id));

    expect(edited).toMatchObject({ status: "approved", data: { price: "4.25" } });
    expect(all.drafts.map((d) => d.status)).toEqual(["approved", "approved", "approved", "discarded", "approved"]);
  });
});

describe("publishing an Import into a Country", () => {
  const twoCountryCafe = async (slug: string) => {
    const tenantId = await insertTenant(db, `Cafe ${slug}`, slug, { country: "US", currency: "USD" });
    const canadaId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
    const usId = (await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId))).find((c) => c.country === "US")!.id;
    return { tenantId, canadaId, usId };
  };
  const approvedImport = async (tenantId: string) => {
    const id = await readyImport(tenantId);
    await runEffect(approveAllImportDraftsSvc(db, tenantId, id));
    return id;
  };
  const menuItemNames = async (tenantId: string, countryId: string) =>
    (await runEffect(listMenuSvc(db, tenantId, undefined, countryId))).flatMap((c) => c.items.map((i) => i.name));

  it("prices the imported items in the named Country only", async () => {
    const { tenantId, canadaId, usId } = await twoCountryCafe("toronto");
    const id = await approvedImport(tenantId);

    await runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "add", undefined, canadaId));

    const rows = await db.select().from(menuItemPrices).where(eq(menuItemPrices.tenantId, tenantId));
    expect(rows.map((r) => [r.countryId, r.isSold])).toEqual([[canadaId, true], [canadaId, true]]);
    expect(await menuItemNames(tenantId, canadaId)).toEqual(["Latte", "Muffin"]);
    expect(await menuItemNames(tenantId, usId)).toEqual([]);
  });

  it("asks which Country when there are several and none is named, writing nothing", async () => {
    const { tenantId } = await twoCountryCafe("ask-country");
    const id = await approvedImport(tenantId);

    await expect(runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "add"))).rejects.toBeInstanceOf(ValidationError);

    expect(await menuNames(tenantId)).toEqual([]);
  });

  it("refuses an archived Country and another cafe's Country before writing", async () => {
    const { tenantId } = await twoCountryCafe("refuse-country");
    const archivedId = await insertCountry(db, tenantId, { country: "MX", currency: "MXN", archivedAt: new Date() });
    const foreignId = await insertCountry(db, await insertTenant(db, "Paris Cafe", "paris"), { country: "FR", currency: "EUR" });
    const id = await approvedImport(tenantId);

    for (const countryId of [archivedId, foreignId, crypto.randomUUID()]) {
      await expect(runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "add", undefined, countryId))).rejects.toBeInstanceOf(NotFoundError);
    }
    expect(await menuNames(tenantId)).toEqual([]);
  });

  it("refuses Replace mode with several open Countries, and keeps the menu", async () => {
    const { tenantId, canadaId } = await twoCountryCafe("no-replace");
    const old = await runEffect(addMenuCategorySvc(db, tenantId, { name: "Old", note: null }));
    const id = await approvedImport(tenantId);

    await expect(runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "replace", undefined, canadaId))).rejects.toBeInstanceOf(ValidationError);

    expect(await menuNames(tenantId)).toEqual([[old.name, []]]);
  });

  it("still allows Replace mode with one Country, named or not", async () => {
    const tenantId = await insertTenant(db, "One Country Cafe", "one-country");
    const [only] = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    await runEffect(addMenuCategorySvc(db, tenantId, { name: "Old", note: null }));
    const id = await approvedImport(tenantId);

    await runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "replace", undefined, only.id));

    expect(await menuNames(tenantId)).toEqual([["Coffee", ["Latte"]], ["Pastries", ["Muffin"]]]);
  });

  it("does not need a Country for an Import without menu drafts", async () => {
    const { tenantId } = await twoCountryCafe("hours-only");
    const locationId = await defaultLocationId(db, tenantId);
    const id = await readyImport(tenantId);
    const { drafts } = await runEffect(getImportSvc(db, tenantId, id));
    await runEffect(updateImportDraftSvc(db, tenantId, id, drafts[3].id, { status: "approved" }));

    await expect(runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "replace", locationId))).resolves.toMatchObject({ businessHours: 1 });
  });
});

describe("publishing an Import", () => {
  it("replaces the menu: old categories go, approved drafts come in, discarded ones never do", async () => {
    const old = await runEffect(addMenuCategorySvc(db, otherCafeId, { name: "Old", note: null }));
    expect(old.name).toBe("Old");
    const pie = await runEffect(
      addMenuItemSvc(db, otherCafeId, {
        categoryId: old.id,
        name: "Old pie",
        description: null,
        price: "1.00",
        variants: null,
        isAvailable: true,
        dietaryTags: [],
      }),
    );
    await runEffect(
      addMenuItemImagesSvc(db, runtime().storage, otherCafeId, pie.id, [
        { name: "old.jpg", contentType: "image/jpeg", bytes: new ArrayBuffer(4) },
      ]),
    );
    expect([...stored.keys()].some((key) => key.startsWith("menu-items/"))).toBe(true);
    const id = await readyImport(otherCafeId);
    const { drafts } = await runEffect(getImportSvc(db, otherCafeId, id));
    await runEffect(approveAllImportDraftsSvc(db, otherCafeId, id));
    await runEffect(updateImportDraftSvc(db, otherCafeId, id, drafts[2].id, { status: "discarded" }));

    const published = await runEffect(publishImportSvc(db, runtime().storage, otherCafeId, id, "replace"));

    expect(published).toMatchObject({ menuCategories: 1, menuItems: 1, businessHours: 1, profileFieldsFilled: 2 });
    expect([...stored.keys()].some((key) => key.startsWith("menu-items/"))).toBe(false);
    expect(await menuNames(otherCafeId)).toEqual([["Coffee", ["Latte"]]]);
    const latte = (await runEffect(getMenuEditorSvc(db, otherCafeId))).categories[0].items[0];
    expect(latte).toMatchObject({ price: "4.75", currency: "USD", availableAtAllLocations: true, locationIds: [] });
  });

  it("gives each published item a sold Country price in the Tenant's Country", async () => {
    const tenantId = await insertTenant(db, "Price Cafe", "price-cafe", { country: "CA", currency: "CAD" });
    const [country] = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    const id = await readyImport(tenantId);
    const { drafts } = await runEffect(getImportSvc(db, tenantId, id));
    await runEffect(approveAllImportDraftsSvc(db, tenantId, id));
    await runEffect(updateImportDraftSvc(db, tenantId, id, drafts[2].id, { status: "discarded" }));

    await runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "add"));

    const [latte] = (await runEffect(getMenuEditorSvc(db, tenantId))).categories[0].items;
    const rows = await db.select().from(menuItemPrices).where(eq(menuItemPrices.tenantId, tenantId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ menuItemId: latte.id, countryId: country.id, price: "4.75", isSold: true });
  });

  it("adds to the menu: old items stay and a same-named category is reused", async () => {
    const category = await runEffect(addMenuCategorySvc(db, sorellaId, { name: "coffee", note: "Mine" }));
    await runEffect(
      addMenuItemSvc(db, sorellaId, {
        categoryId: category.id,
        name: "Espresso",
        description: null,
        price: "3.00",
              variants: null,
        isAvailable: true,
        dietaryTags: [],
      }),
    );
    const id = await readyImport();
    await runEffect(approveAllImportDraftsSvc(db, sorellaId, id));

    await runEffect(publishImportSvc(db, runtime().storage, sorellaId, id, "add"));

    const menu = await runEffect(getMenuEditorSvc(db, sorellaId));
    const coffee = menu.categories.find((c) => c.name.toLowerCase() === "coffee");
    expect(menu.categories.filter((c) => c.name.toLowerCase() === "coffee")).toHaveLength(1);
    expect(coffee?.note).toBe("Mine");
    expect(coffee?.items.map((i) => i.name).toSorted()).toEqual(["Espresso", "Latte"]);
  });

  it("replaces the weekly hours and fills only the empty profile fields", async () => {
    await db.insert(tenantBusinessHours).values([
      { tenantId: sorellaId, locationId: await defaultLocationId(db, sorellaId), dayOfWeek: 0, isClosed: false, opensAt: "09:00", closesAt: "12:00" },
      { tenantId: sorellaId, locationId: await defaultLocationId(db, sorellaId), dayOfWeek: 2, isClosed: false, opensAt: "09:00", closesAt: "12:00" },
    ]);
    await runEffect(updateBusinessProfileSvc(db, sorellaId, { phone: "111-111-1111" }));
    const id = await readyImport();
    await runEffect(approveAllImportDraftsSvc(db, sorellaId, id));

    await runEffect(publishImportSvc(db, runtime().storage, sorellaId, id, "add"));

    const hours = await db.select().from(tenantBusinessHours).where(eq(tenantBusinessHours.tenantId, sorellaId));
    expect(hours.map((h) => [h.dayOfWeek, h.opensAt, h.closesAt])).toEqual([[1, "08:00:00", "16:00:00"]]);
    expect(await runEffect(getBusinessProfileSvc(db, sorellaId))).toMatchObject({
      phone: "111-111-1111",
      email: "hello@sorella.test",
    });
  });

  it("asks which Location when the Tenant has several, and changes nothing until one is named", async () => {
    const tenantId = await insertTenant(db, "Multi Cafe", "multi");
    const downtownId = await defaultLocationId(db, tenantId);
    const airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
    const id = await readyImport(tenantId);
    await runEffect(approveAllImportDraftsSvc(db, tenantId, id));

    await expect(runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "replace"))).rejects.toBeInstanceOf(ValidationError);
    expect(await menuNames(tenantId)).toEqual([]);

    await runEffect(publishImportSvc(db, runtime().storage, tenantId, id, "replace", airportId));

    const hours = await db.select().from(tenantBusinessHours).where(eq(tenantBusinessHours.tenantId, tenantId));
    expect(hours.map((h) => [h.locationId, h.dayOfWeek])).toEqual([[airportId, 1]]);
    const locations = await db.select().from(tenantLocations).where(eq(tenantLocations.tenantId, tenantId));
    expect(locations.map((l) => [l.id, l.phone]).toSorted()).toEqual(
      [[airportId, "845-871-2010"], [downtownId, null]].toSorted(),
    );
    expect(await runEffect(getBusinessProfileSvc(db, tenantId, airportId))).toMatchObject({ email: "hello@sorella.test" });
  });

  it("leaves the live menu alone when no menu draft is approved", async () => {
    const before = await menuNames();
    const id = await readyImport();
    const { drafts } = await runEffect(getImportSvc(db, sorellaId, id));
    await runEffect(updateImportDraftSvc(db, sorellaId, id, drafts[3].id, { status: "approved" }));

    await runEffect(publishImportSvc(db, runtime().storage, sorellaId, id, "replace"));

    expect(await menuNames()).toEqual(before);
  });

  it("publishes once, and not before the Import is ready", async () => {
    const id = await readyImport();
    await runEffect(approveAllImportDraftsSvc(db, sorellaId, id));
    extraction = async () => MENU;
    const running = await runEffect(createImportSvc(runtime(), sorellaId, [file("late.jpg")]));

    await runEffect(publishImportSvc(db, runtime().storage, sorellaId, id, "add"));

    await expect(runEffect(publishImportSvc(db, runtime().storage, sorellaId, id, "add"))).rejects.toBeInstanceOf(ConflictError);
    await expect(runEffect(publishImportSvc(db, runtime().storage, sorellaId, running.id, "add"))).rejects.toEqual(
      new ConflictError(IMPORT_NOT_READY),
    );
    const [first] = (await runEffect(getImportSvc(db, sorellaId, id))).drafts;
    await expect(
      runEffect(updateImportDraftSvc(db, sorellaId, id, first.id, { status: "discarded" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("changes nothing when something fails while publishing", async () => {
    const before = await menuNames(otherCafeId);
    const id = await readyImport(otherCafeId);
    await runEffect(approveAllImportDraftsSvc(db, otherCafeId, id));
    // The menu is replaced first and the hours last: breaking the hours table fails the
    // publish after the menu was already rewritten, so only a rollback can restore it.
    await db.execute(sql`alter table tenant_business_hours rename to tenant_business_hours_broken`);

    await expect(runEffect(publishImportSvc(db, runtime().storage, otherCafeId, id, "replace"))).rejects.toBeDefined();
    await db.execute(sql`alter table tenant_business_hours_broken rename to tenant_business_hours`);

    expect(await menuNames(otherCafeId)).toEqual(before);
    const [row] = await db.select().from(imports).where(eq(imports.id, id));
    expect(row.publishedAt).toBeNull();
  });
});
