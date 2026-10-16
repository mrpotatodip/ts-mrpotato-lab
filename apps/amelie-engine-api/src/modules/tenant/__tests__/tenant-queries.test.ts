import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import {
  menuItemPrices,
  partyRoles,
  accessMasterPowers,
  accessMasterRoles,
  accessRolePowers,
  findTenantRole,
  roles,
  tenantCountries,
  tenants as tenantTable,
} from "@repo/db-amelie";
import {
  ACCESS_ROLE_GRANTS,
  ALLOWED_ORIGINS_MAX,
  COUNTRIES,
  COUNTRY_VALUES,
  CURRENCY_VALUES,
  hasAccessPower,
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
  await insertMember(db, sorellaId, sorellaOwner.partyId, "tenant_admin");
  await insertMember(db, otherCafeId, otherOwner.partyId, "tenant_admin");
});

describe("listTenantsSvc", () => {
  it("returns only the Tenants the login's Person belongs to, with the role", async () => {
    const tenants = await runEffect(listTenantsSvc(db, sorellaOwner.userId));

    expect(tenants).toHaveLength(1);
    expect(tenants[0]).toMatchObject({
      id: sorellaId,
      name: "Sorella Cafe",
      slug: "sorella",
      timezone: "America/New_York",
      country: "US",
      currency: "USD",
      allowedOrigins: [],
      customerChatLabel: "Chat with us",
      customerChatAccent: null,
      role: "tenant_admin",
      roleLabel: "Tenant admin",
    });
    expect(tenants[0].powers.toSorted()).toEqual([...ACCESS_ROLE_GRANTS.tenant_admin].toSorted());
  });

  it("returns every Tenant for a Person who runs two", async () => {
    const both = await insertPersonWithLogin(db, "runs-both@test");
    await insertMember(db, sorellaId, both.partyId, "store_admin");
    await insertMember(db, otherCafeId, both.partyId, "store_staff");

    const tenants = await runEffect(listTenantsSvc(db, both.userId));

    expect(tenants.map((t) => [t.slug, t.role])).toEqual([
      ["other-cafe", "store_staff"],
      ["sorella", "store_admin"],
    ]);
    const bySlug = Object.fromEntries(tenants.map((t) => [t.slug, t]));
    expect(hasAccessPower(bySlug.sorella.powers, "company:team:invites:create")).toBe(false);
    expect(hasAccessPower(bySlug.sorella.powers, "company:menu:items:update")).toBe(true);
    expect(hasAccessPower(bySlug["other-cafe"].powers, "company:menu:items:update")).toBe(false);
    expect(hasAccessPower(bySlug["other-cafe"].powers, "company:menu:items:read")).toBe(true);
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
    await insertMember(db, manilaId, owner.partyId, "tenant_admin");

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

describe("powers", () => {
  it("gives cafe writes to tenant_admin and store_admin, and team writes only to tenant_admin", async () => {
    const cafeId = sorellaId;
    const powersFor = async (key: "tenant_admin" | "store_admin" | "store_staff") => {
      const login = await insertPersonWithLogin(db, `${key}@can-edit.test`);
      await insertMember(db, cafeId, login.partyId, key);
      return (await runEffect(getTenantSvc(db, login.userId, cafeId))).powers;
    };

    const tenantAdmin = await powersFor("tenant_admin");
    const storeAdmin = await powersFor("store_admin");
    const storeStaff = await powersFor("store_staff");
    expect(hasAccessPower(tenantAdmin, "company:team:invites:create")).toBe(true);
    expect(hasAccessPower(storeAdmin, "company:menu:items:update")).toBe(true);
    expect(hasAccessPower(storeAdmin, "company:team:invites:create")).toBe(false);
    expect(hasAccessPower(storeStaff, "company:menu:items:update")).toBe(false);
    expect(hasAccessPower(storeStaff, "company:menu:items:read")).toBe(true);
  });

  it("follows the Master Role's access_role_powers rows, not its name", async () => {
    const cafeId = sorellaId;
    const login = await insertPersonWithLogin(db, "flag-staff@test");
    await insertMember(db, cafeId, login.partyId, "store_staff");
    const [staffMaster] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, "store_staff"));
    const [updatePower] = await db
      .select()
      .from(accessMasterPowers)
      .where(eq(accessMasterPowers.power, "company:menu:items:update"));
    await db.insert(accessRolePowers).values({ masterRoleId: staffMaster.id, masterPowerId: updatePower.id, scope: "tenant" });

    const tenant = await runEffect(getTenantSvc(db, login.userId, cafeId));
    await db
      .delete(accessRolePowers)
      .where(and(eq(accessRolePowers.masterRoleId, staffMaster.id), eq(accessRolePowers.masterPowerId, updatePower.id)));
    expect(tenant.role).toBe("store_staff");
    expect(hasAccessPower(tenant.powers, "company:menu:items:update")).toBe(true);
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

describe("access_master_roles", () => {
  it("seeds every Role key as a Master Role", async () => {
    const rows = await db.select({ key: accessMasterRoles.key }).from(accessMasterRoles);
    expect(rows.map((row) => row.key).toSorted()).toEqual(["store_admin", "store_staff", "superuser", "tenant_admin"]);
  });

  it("rejects a repeated Master Role key", async () => {
    await expect(db.insert(accessMasterRoles).values({ key: "tenant_admin", label: "Again", scope: "tenant" })).rejects.toMatchObject({
      cause: { constraint: "uq_access_master_roles_key" },
    });
  });

  it("rejects a Role whose Master Role does not exist", async () => {
    await expect(
      db.insert(roles).values({ tenantId: sorellaId, masterRoleId: crypto.randomUUID(), scope: "tenant" }),
    ).rejects.toMatchObject({ cause: { constraint: "roles_master_role_fk" } });
  });

  it("rejects a Role whose scope differs from its Master Role", async () => {
    const [staffMaster] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, "store_staff"));

    await expect(
      db.insert(roles).values({ masterRoleId: staffMaster.id, scope: "platform" }),
    ).rejects.toMatchObject({ cause: { constraint: "roles_master_role_fk" } });
  });
});

describe("party_roles rules", () => {
  const masterRole = async (key: string) => {
    const [master] = await db.select().from(accessMasterRoles).where(eq(accessMasterRoles.key, key));
    return master;
  };
  const roleIn = async (tenantId: string, key: string) => {
    const role = await findTenantRole(db, tenantId, key);
    if (!role) throw new Error(`No ${key} role in the tenant`);
    return role;
  };
  const globalRole = async () => {
    const master = await masterRole("superuser");
    await db.insert(roles).values({ masterRoleId: master.id, scope: "platform" }).onConflictDoNothing();
    const [role] = await db
      .select()
      .from(roles)
      .where(and(isNull(roles.tenantId), eq(roles.masterRoleId, master.id)));
    return role;
  };

  it("rejects a second role for the same Person in one Tenant", async () => {
    await expect(insertMember(db, sorellaId, sorellaOwner.partyId, "store_staff")).rejects.toMatchObject({
      cause: { constraint: "uq_party_roles_tenant_party" },
    });
  });

  it("rejects an Organization holding a role", async () => {
    const organizationPartyId = await insertOrganization(db, "Not A Person");
    const staff = await roleIn(sorellaId, "store_staff");

    await expect(
      db.insert(partyRoles).values({
        partyId: organizationPartyId,
        tenantId: sorellaId,
        roleId: staff.id,
        roleScope: "tenant",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_party_id_persons_party_id_fk" } });
  });

  it("allows a global superuser Role with no Tenant, once per Person", async () => {
    const superuser = await globalRole();
    const person = await insertPersonWithLogin(db, "root@test");
    const row = { partyId: person.partyId, roleId: superuser.id, roleScope: "platform" } as const;

    await db.insert(partyRoles).values(row);

    await expect(db.insert(partyRoles).values(row)).rejects.toMatchObject({
      cause: { constraint: "uq_party_roles_platform" },
    });
  });

  it("rejects a superuser row that names a Tenant", async () => {
    const superuser = await globalRole();
    const person = await insertPersonWithLogin(db, "root-with-cafe@test");

    await expect(
      db.insert(partyRoles).values({
        partyId: person.partyId,
        tenantId: sorellaId,
        roleId: superuser.id,
        roleScope: "platform",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_platform_global" } });
  });

  it("rejects a cafe role without a Tenant", async () => {
    const staff = await roleIn(sorellaId, "store_staff");
    const person = await insertPersonWithLogin(db, "no-cafe@test");

    await expect(
      db.insert(partyRoles).values({ partyId: person.partyId, roleId: staff.id, roleScope: "tenant" }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_platform_global" } });
  });

  it("rejects a cafe role used in another Tenant", async () => {
    const staff = await roleIn(sorellaId, "store_staff");
    const person = await insertPersonWithLogin(db, "wrong-cafe@test");

    await expect(
      db.insert(partyRoles).values({
        partyId: person.partyId,
        tenantId: otherCafeId,
        roleId: staff.id,
        roleScope: "tenant",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "party_roles_role_tenant_fk" } });
  });

  it("rejects a Role row that breaks the platform rule", async () => {
    const superuserMaster = await masterRole("superuser");
    const staffMaster = await masterRole("store_staff");

    await expect(
      db.insert(roles).values({ tenantId: sorellaId, masterRoleId: superuserMaster.id, scope: "platform" }),
    ).rejects.toMatchObject({ cause: { constraint: "roles_scope_tenant" } });
    await expect(
      db.insert(roles).values({ masterRoleId: staffMaster.id, scope: "tenant" }),
    ).rejects.toMatchObject({ cause: { constraint: "roles_scope_tenant" } });
  });

  it("rejects a repeated Master Role in one Tenant", async () => {
    const staffMaster = await masterRole("store_staff");

    await expect(
      db.insert(roles).values({ tenantId: sorellaId, masterRoleId: staffMaster.id, scope: "tenant" }),
    ).rejects.toMatchObject({ cause: { constraint: "uq_roles_tenant_master_role" } });
  });

  it("rejects a platform Power on a tenant Master Role", async () => {
    const staffMaster = await masterRole("store_staff");
    const [platformPower] = await db
      .select()
      .from(accessMasterPowers)
      .where(eq(accessMasterPowers.power, "platform:admin:invite_codes:read"));

    await expect(
      db.insert(accessRolePowers).values({
        masterRoleId: staffMaster.id,
        masterPowerId: platformPower.id,
        scope: "tenant",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "access_role_powers_master_power_fk" } });
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
  const newCafe = async (slug: string, role: "tenant_admin" | "store_admin" | "store_staff") => {
    const tenantId = await insertTenant(db, slug, slug);
    const login = await insertPersonWithLogin(db, `${role}@${slug}.test`);
    await insertMember(db, tenantId, login.partyId, role);
    return { tenantId, userId: login.userId };
  };

  it("lets an owner change country and currency, and the change persists", async () => {
    const { tenantId, userId } = await newCafe("region-owner", "tenant_admin");

    const saved = await runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "PH", currency: "PHP" }));

    expect(saved).toMatchObject({ id: tenantId, country: "PH", currency: "PHP" });
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "PH", currency: "PHP" });
  });

  it("mirrors the new currency onto the Country and keeps every Country price's number", async () => {
    const { tenantId, userId } = await newCafe("region-mirror", "tenant_admin");
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
    const { tenantId, userId } = await newCafe("region-first-open", "tenant_admin");
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
    const { tenantId, userId } = await newCafe("region-taken", "tenant_admin");
    await insertCountry(db, tenantId, { country: "CA", currency: "CAD", archivedAt: new Date() });

    await expect(
      runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "CA", currency: "CAD" })),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "US", currency: "USD" });
  });

  it("reads the region from the first open Country", async () => {
    const { tenantId, userId } = await newCafe("region-read", "tenant_admin");
    await db.update(tenantCountries).set({ country: "JP", currency: "JPY" }).where(eq(tenantCountries.tenantId, tenantId));

    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({ country: "JP", currency: "JPY" });
    expect(await runEffect(listTenantsSvc(db, userId))).toMatchObject([{ country: "JP", currency: "JPY" }]);
  });

  it("lets a manager change the region", async () => {
    const { tenantId, userId } = await newCafe("region-manager", "store_admin");

    const saved = await runEffect(updateTenantRegionSvc(db, userId, tenantId, { country: "KH", currency: "USD" }));

    expect(saved).toMatchObject({ country: "KH", currency: "USD" });
  });

  it("refuses staff and leaves the region unchanged", async () => {
    const { tenantId, userId } = await newCafe("region-staff", "store_staff");

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
  const newCafe = async (slug: string, role: "tenant_admin" | "store_admin" | "store_staff") => {
    const tenantId = await insertTenant(db, slug, slug);
    const login = await insertPersonWithLogin(db, `${role}@${slug}.test`);
    await insertMember(db, tenantId, login.partyId, role);
    return { tenantId, userId: login.userId };
  };

  it("lets an owner replace the list, and the change persists", async () => {
    const { tenantId, userId } = await newCafe("origins-owner", "tenant_admin");

    const saved = await runEffect(
      updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://sorellacafe.com", "http://localhost:5174"]),
    );

    expect(saved.allowedOrigins).toEqual(["https://sorellacafe.com", "http://localhost:5174"]);
    expect(await runEffect(getTenantSvc(db, userId, tenantId))).toMatchObject({
      allowedOrigins: ["https://sorellacafe.com", "http://localhost:5174"],
    });
  });

  it("lets a manager replace the list", async () => {
    const { tenantId, userId } = await newCafe("origins-manager", "store_admin");

    const saved = await runEffect(updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://other.test"]));

    expect(saved.allowedOrigins).toEqual(["https://other.test"]);
  });

  it("refuses staff and leaves the list unchanged", async () => {
    const { tenantId, userId } = await newCafe("origins-staff", "store_staff");
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
    const { tenantId, userId } = await newCafe("origins-profile", "tenant_admin");
    await runEffect(updateBusinessProfileSvc(db, tenantId, { websiteUrl: "https://sorellacafe.com" }));

    await runEffect(updateTenantAllowedOriginsSvc(db, userId, tenantId, ["https://other.test"]));

    expect(await runEffect(getTenantProfileSvc(db, tenantId))).toMatchObject({
      websiteUrl: "https://sorellacafe.com",
    });
  });
});
