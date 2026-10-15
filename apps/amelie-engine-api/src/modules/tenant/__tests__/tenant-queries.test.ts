import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { menuItemPrices, partyRoles, roles, tenantCountries, tenants as tenantTable } from "@repo/db-amelie";
import {
  ALLOWED_ORIGINS_MAX,
  COUNTRIES,
  COUNTRY_VALUES,
  CURRENCY_VALUES,
  TenantRegionSchema,
  UpdateTenantAllowedOriginsBodySchema,
  UpdateTenantCustomerChatBodySchema,
} from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { ConflictError, ForbiddenError, NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { addMenuCategorySvc, addMenuItemSvc } from "#/modules/menu";
import { getTenantProfileSvc, updateBusinessProfileSvc } from "#/modules/business-profile/handlers";
import {
  getTenantSvc,
  listPublicTenantsSvc,
  listTenantsSvc,
  updateTenantAllowedOriginsSvc,
  updateTenantRegionSvc,
} from "#/modules/tenant/handlers";
import {
  createTestDb,
  insertMember,
  insertCountry,
  insertOrganization,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let sorellaOwner: { userId: string; partyId: string };
let otherOwner: { userId: string; partyId: string };

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  sorellaOwner = await insertPersonWithLogin(db, "owner@sorella.test");
  otherOwner = await insertPersonWithLogin(db, "owner@other.test");
  await insertMember(db, sorellaId, sorellaOwner.partyId, "owner");
  await insertMember(db, otherCafeId, otherOwner.partyId, "owner");
});

describe("listTenantsSvc", () => {
  it("returns only the Tenants the login's Person belongs to, with the role", async () => {
    const tenants = await runEffect(listTenantsSvc(db, sorellaOwner.userId));

    expect(tenants).toEqual([
      {
        id: sorellaId,
        name: "Sorella Cafe",
        slug: "sorella",
        timezone: "America/New_York",
        country: "US",
        currency: "USD",
        allowedOrigins: [],
        customerChatLabel: "Chat with us",
        customerChatAccent: null,
        role: "owner",
        canEdit: true,
      },
    ]);
  });

  it("returns every Tenant for a Person who runs two", async () => {
    const both = await insertPersonWithLogin(db, "runs-both@test");
    await insertMember(db, sorellaId, both.partyId, "manager");
    await insertMember(db, otherCafeId, both.partyId, "staff");

    const tenants = await runEffect(listTenantsSvc(db, both.userId));

    expect(tenants.map((t) => [t.slug, t.role, t.canEdit])).toEqual([
      ["other-cafe", "staff", false],
      ["sorella", "manager", true],
    ]);
  });

  it("returns nothing for a login with no memberships", async () => {
    const loner = await insertPersonWithLogin(db, "loner@test");

    await expect(runEffect(listTenantsSvc(db, loner.userId))).resolves.toEqual([]);
  });
});

describe("tenant region", () => {
  it("stores the country and currency a Tenant is created with", async () => {
    const manilaId = await insertTenant(db, "Manila Cafe", "manila", { country: "PH", currency: "PHP" });
    const owner = await insertPersonWithLogin(db, "owner@manila.test");
    await insertMember(db, manilaId, owner.partyId, "owner");

    const tenant = await runEffect(getTenantSvc(db, owner.userId, manilaId));

    expect(tenant).toMatchObject({ country: "PH", currency: "PHP" });
  });

  it("rejects a currency that is not three capital letters", async () => {
    await expect(insertTenant(db, "Bad Cafe", "bad", { country: "US", currency: "usd" })).rejects.toMatchObject({
      cause: { constraint: "tenant_countries_currency_format" },
    });
  });

  it("rejects a country that is not two capital letters", async () => {
    await expect(insertTenant(db, "Bad Cafe 2", "bad-2", { country: "USA", currency: "USD" })).rejects.toMatchObject({
      cause: { constraint: "tenant_countries_country_format" },
    });
  });
});

describe("region constants", () => {
  it("offers every currency a country pre-selects", () => {
    const offered = new Set<string>(CURRENCY_VALUES);

    expect(COUNTRIES.filter((c) => !offered.has(c.currency))).toEqual([]);
  });

  it("maps exactly the countries on offer", () => {
    expect(COUNTRIES.map((c) => c.country)).toEqual([...COUNTRY_VALUES]);
  });
});

describe("TenantRegionSchema", () => {
  it("accepts a listed country and currency", () => {
    expect(TenantRegionSchema.safeParse({ country: "PH", currency: "PHP" }).success).toBe(true);
  });

  it("rejects values outside the shared lists", () => {
    expect(TenantRegionSchema.safeParse({ country: "ZZ", currency: "PHP" }).success).toBe(false);
    expect(TenantRegionSchema.safeParse({ country: "PH", currency: "XXX" }).success).toBe(false);
  });
});

describe("canEdit", () => {
  it("is true for owner and manager and false for staff", async () => {
    const cafeId = sorellaId;
    const canEditFor = async (key: "owner" | "manager" | "staff") => {
      const login = await insertPersonWithLogin(db, `${key}@can-edit.test`);
      await insertMember(db, cafeId, login.partyId, key);
      return (await runEffect(getTenantSvc(db, login.userId, cafeId))).canEdit;
    };

    expect(await canEditFor("owner")).toBe(true);
    expect(await canEditFor("manager")).toBe(true);
    expect(await canEditFor("staff")).toBe(false);
  });

  it("follows the Role's can_edit flag, not its name", async () => {
    const cafeId = sorellaId;
    const login = await insertPersonWithLogin(db, "flag-staff@test");
    await insertMember(db, cafeId, login.partyId, "staff");

    await db
      .update(roles)
      .set({ canEdit: true })
      .where(and(eq(roles.tenantId, cafeId), eq(roles.key, "staff")));

    const tenant = await runEffect(getTenantSvc(db, login.userId, cafeId));
    await db
      .update(roles)
      .set({ canEdit: false })
      .where(and(eq(roles.tenantId, cafeId), eq(roles.key, "staff")));
    expect(tenant).toMatchObject({ role: "staff", canEdit: true });
  });
});

describe("getTenantSvc", () => {
  it("returns a Tenant the login is a member of", async () => {
    const tenant = await runEffect(getTenantSvc(db, sorellaOwner.userId, sorellaId));

    expect(tenant.slug).toBe("sorella");
  });

  it("refuses another Tenant's resources as not found (spec test 5)", async () => {
    await expect(runEffect(getTenantSvc(db, otherOwner.userId, sorellaId))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("treats an unknown Tenant id the same as a foreign one", async () => {
    await expect(
      runEffect(getTenantSvc(db, sorellaOwner.userId, crypto.randomUUID())),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("party_roles rules", () => {
  const roleIn = async (tenantId: string, key: string) => {
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.key, key)));
    return role;
  };
  const globalRole = async () => {
    const [role] = await db.insert(roles).values({ key: "superuser", canEdit: false }).returning();
    return role;
  };

  it("rejects a second role for the same Person in one Tenant", async () => {
    await expect(insertMember(db, sorellaId, sorellaOwner.partyId, "staff")).rejects.toMatchObject({
      cause: { constraint: "uq_party_roles_tenant_party" },
    });
  });

  it("rejects an Organization holding a role", async () => {
    const organizationPartyId = await insertOrganization(db, "Not A Person");
    const staff = await roleIn(sorellaId, "staff");

    await expect(
      db.insert(partyRoles).values({
        partyId: organizationPartyId,
        tenantId: sorellaId,
        roleId: staff.id,
        roleKey: "staff",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_party_id_persons_party_id_fk" } });
  });

  it("allows a global superuser Role with no Tenant, once per Person", async () => {
    const superuser = await globalRole();
    const person = await insertPersonWithLogin(db, "root@test");
    const row = { partyId: person.partyId, roleId: superuser.id, roleKey: "superuser" };

    await db.insert(partyRoles).values(row);

    await expect(db.insert(partyRoles).values(row)).rejects.toMatchObject({
      cause: { constraint: "uq_party_roles_superuser" },
    });
  });

  it("rejects a superuser row that names a Tenant", async () => {
    const [superuser] = await db.select().from(roles).where(eq(roles.key, "superuser"));
    const person = await insertPersonWithLogin(db, "root-with-cafe@test");

    await expect(
      db.insert(partyRoles).values({
        partyId: person.partyId,
        tenantId: sorellaId,
        roleId: superuser.id,
        roleKey: "superuser",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_superuser_global" } });
  });

  it("rejects a cafe role without a Tenant", async () => {
    const staff = await roleIn(sorellaId, "staff");
    const person = await insertPersonWithLogin(db, "no-cafe@test");

    await expect(
      db.insert(partyRoles).values({ partyId: person.partyId, roleId: staff.id, roleKey: "staff" }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_superuser_global" } });
  });

  it("rejects a cafe role used in another Tenant", async () => {
    const staff = await roleIn(sorellaId, "staff");
    const person = await insertPersonWithLogin(db, "wrong-cafe@test");

    await expect(
      db.insert(partyRoles).values({
        partyId: person.partyId,
        tenantId: otherCafeId,
        roleId: staff.id,
        roleKey: "staff",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_role_tenant_fk" } });
  });

  it("rejects a Role row that breaks the superuser rule", async () => {
    await expect(db.insert(roles).values({ tenantId: sorellaId, key: "superuser" })).rejects.toMatchObject({
      cause: { constraint: "roles_superuser_global" },
    });
    await expect(db.insert(roles).values({ key: "staff" })).rejects.toMatchObject({
      cause: { constraint: "roles_superuser_global" },
    });
  });

  it("rejects a repeated Role key in one Tenant", async () => {
    await expect(db.insert(roles).values({ tenantId: sorellaId, key: "staff" })).rejects.toMatchObject({
      cause: { constraint: "uq_roles_tenant_key" },
    });
  });
});

describe("listPublicTenantsSvc", () => {
  it("lists every Tenant by name and slug only, by name", async () => {
    const tenants = await runEffect(listPublicTenantsSvc(db));

    expect(tenants).toEqual([
      { name: "Manila Cafe", slug: "manila" },
      { name: "Other Cafe", slug: "other-cafe" },
      { name: "Sorella Cafe", slug: "sorella" },
    ]);
  });
});

describe("updateTenantRegionSvc", () => {
  const newCafe = async (slug: string, role: "owner" | "manager" | "staff") => {
    const tenantId = await insertTenant(db, slug, slug);
    const login = await insertPersonWithLogin(db, `${role}@${slug}.test`);
    await insertMember(db, tenantId, login.partyId, role);
    return { tenantId, userId: login.userId };
  };

  it("lets an owner change country and currency, and the change persists", async () => {
    const { tenantId, userId } = await newCafe("region-owner", "owner");

    const saved = await runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "PH", currency: "PHP" }));

    expect(saved).toMatchObject({ id: tenantId, country: "PH", currency: "PHP" });
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "PH", currency: "PHP" });
  });

  it("mirrors the new currency onto the Country and keeps every Country price's number", async () => {
    const { tenantId, userId } = await newCafe("region-mirror", "owner");
    const category = await runEffect(addMenuCategorySvc(db, tenantId, { name: "Bakery", note: null }));
    const item = await runEffect(
      addMenuItemSvc(db, tenantId, {
        categoryId: category.id,
        name: "Muffin",
        description: null,
        price: "4.50",
        variants: null,
        isAvailable: true,
        dietaryTags: [],
      }),
    );

    await runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "US", currency: "CAD" }));

    const countries = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    expect(countries).toHaveLength(1);
    expect(countries[0]).toMatchObject({ country: "US", currency: "CAD" });
    const prices = await db.select().from(menuItemPrices).where(eq(menuItemPrices.menuItemId, item.id));
    expect(prices.map((p) => [p.countryId, p.price])).toEqual([[countries[0].id, "4.50"]]);
  });

  it("edits the only open Country, not an archived one", async () => {
    const { tenantId, userId } = await newCafe("region-first-open", "owner");
    const [first] = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    await db.update(tenantCountries).set({ archivedAt: new Date() }).where(eq(tenantCountries.id, first.id));
    const open = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });

    const saved = await runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "PH", currency: "PHP" }));

    expect(saved).toMatchObject({ country: "PH", currency: "PHP" });
    const rows = await db.select().from(tenantCountries).where(eq(tenantCountries.tenantId, tenantId));
    const byId = new Map(rows.map((r) => [r.id, `${r.country}/${r.currency}`]));
    expect(byId.get(open)).toBe("PH/PHP");
    expect(byId.get(first.id)).toBe("US/USD");
    expect(rows.map((r) => r.country).toSorted()).toEqual(["PH", "US"]);
  });

  it("refuses a country the Tenant already has in an archived Country", async () => {
    const { tenantId, userId } = await newCafe("region-taken", "owner");
    await insertCountry(db, tenantId, { country: "CA", currency: "CAD", archivedAt: new Date() });

    await expect(
      runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "CA", currency: "CAD" })),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "US", currency: "USD" });
  });

  it("reads the region from the first open Country", async () => {
    const { tenantId, userId } = await newCafe("region-read", "owner");
    await db.update(tenantCountries).set({ country: "JP", currency: "JPY" }).where(eq(tenantCountries.tenantId, tenantId));

    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "JP", currency: "JPY" });
    expect(await runEffect(listTenantsSvc(db, userId))).toMatchObject([{ country: "JP", currency: "JPY" }]);
  });

  it("lets a manager change the region", async () => {
    const { tenantId, userId } = await newCafe("region-manager", "manager");

    const saved = await runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "KH", currency: "USD" }));

    expect(saved).toMatchObject({ country: "KH", currency: "USD" });
  });

  it("refuses staff and leaves the region unchanged", async () => {
    const { tenantId, userId } = await newCafe("region-staff", "staff");

    await expect(
      runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "PH", currency: "PHP" })),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "US", currency: "USD" });
  });

  it("reads another Tenant as not found", async () => {
    await expect(
      runEffect(updateTenantRegionSvc(db, otherOwner.userId, sorellaId, { country: "PH", currency: "PHP" })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("UpdateTenantAllowedOriginsBodySchema", () => {
  it("turns pasted URLs into unique origins in save order", () => {
    const parsed = UpdateTenantAllowedOriginsBodySchema.parse({
      allowedOrigins: [
        "https://sorellacafe.com/menu",
        "https://sorellacafe.com/hours",
        "http://localhost:5174/",
      ],
    });

    expect(parsed.allowedOrigins).toEqual(["https://sorellacafe.com", "http://localhost:5174"]);
  });

  it("accepts an empty list", () => {
    expect(UpdateTenantAllowedOriginsBodySchema.parse({ allowedOrigins: [] }).allowedOrigins).toEqual([]);
  });

  it.each(["*", "ftp://sorellacafe.com", "not a url", "https://"])("rejects %s", (value) => {
    expect(UpdateTenantAllowedOriginsBodySchema.safeParse({ allowedOrigins: [value] }).success).toBe(false);
  });

  it("rejects more than 20 unique origins", () => {
    const allowedOrigins = Array.from({ length: ALLOWED_ORIGINS_MAX + 1 }, (_, i) => `https://cafe-${i}.example`);

    expect(UpdateTenantAllowedOriginsBodySchema.safeParse({ allowedOrigins }).success).toBe(false);
  });

  it("keeps 21 copies of the same site as one origin", () => {
    const allowedOrigins = Array.from({ length: ALLOWED_ORIGINS_MAX + 1 }, () => "https://sorellacafe.com/menu");

    expect(UpdateTenantAllowedOriginsBodySchema.parse({ allowedOrigins }).allowedOrigins).toEqual([
      "https://sorellacafe.com",
    ]);
  });
});

describe("UpdateTenantCustomerChatBodySchema", () => {
  it("trims the label and lowercases the colour", () => {
    expect(
      UpdateTenantCustomerChatBodySchema.parse({
        customerChatLabel: " Ask Sorella ",
        customerChatAccent: "#B4532A",
      }),
    ).toEqual({ customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" });
  });

  it("treats a blank colour as the default", () => {
    expect(
      UpdateTenantCustomerChatBodySchema.parse({ customerChatLabel: "Hi", customerChatAccent: "  " }),
    ).toEqual({ customerChatLabel: "Hi", customerChatAccent: null });
  });

  it("rejects an empty label and a non-hex colour", () => {
    expect(
      UpdateTenantCustomerChatBodySchema.safeParse({ customerChatLabel: "  ", customerChatAccent: null }).success,
    ).toBe(false);
    expect(
      UpdateTenantCustomerChatBodySchema.safeParse({ customerChatLabel: "Hi", customerChatAccent: "red" }).success,
    ).toBe(false);
  });
});

describe("updateTenantAllowedOriginsSvc", () => {
  const newCafe = async (slug: string, role: "owner" | "manager" | "staff") => {
    const tenantId = await insertTenant(db, slug, slug);
    const login = await insertPersonWithLogin(db, `${role}@${slug}.test`);
    await insertMember(db, tenantId, login.partyId, role);
    return { tenantId, userId: login.userId };
  };

  it("lets an owner replace the list, and the change persists", async () => {
    const { tenantId, userId } = await newCafe("origins-owner", "owner");

    const saved = await runEffect(
      updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://sorellacafe.com", "http://localhost:5174"]),
    );

    expect(saved.allowedOrigins).toEqual(["https://sorellacafe.com", "http://localhost:5174"]);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
      allowedOrigins: ["https://sorellacafe.com", "http://localhost:5174"],
    });
  });

  it("lets a manager replace the list", async () => {
    const { tenantId, userId } = await newCafe("origins-manager", "manager");

    const saved = await runEffect(updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://other.test"]));

    expect(saved.allowedOrigins).toEqual(["https://other.test"]);
  });

  it("refuses staff and leaves the list unchanged", async () => {
    const { tenantId, userId } = await newCafe("origins-staff", "staff");
    await db.update(tenantTable).set({ allowedOrigins: ["https://keep.test"] }).where(eq(tenantTable.id, tenantId));

    await expect(
      runEffect(updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://new.test"])),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
      allowedOrigins: ["https://keep.test"],
    });
  });

  it("reads another Tenant as not found", async () => {
    await expect(
      runEffect(updateTenantAllowedOriginsSvc(db, otherOwner.userId, sorellaId, ["https://steal.test"])),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("does not change the Business profile website", async () => {
    const { tenantId, userId } = await newCafe("origins-profile", "owner");
    await runEffect(updateBusinessProfileSvc(db, tenantId, { websiteUrl: "https://sorellacafe.com" }));

    await runEffect(updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://other.test"]));

    expect(await runEffect(getTenantProfileSvc(db, tenantId))).toMatchObject({
      websiteUrl: "https://sorellacafe.com",
    });
  });
});
