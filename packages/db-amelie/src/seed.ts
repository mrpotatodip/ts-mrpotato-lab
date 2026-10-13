import { and, eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./client";
import {
  authAccount,
  authUser,
  tenantBusinessHours,
  tenantBusinessHoursOverrides,
  tenantBusinessProfiles,
  tenantLocations,
  dietaryTags,
  tenantFaqCategories,
  tenantFaqs,
  tenantMenuCategories,
  tenantMenuItemDietaryTags,
  tenantMenuItems,
  organizations,
  parties,
  persons,
  DEFAULT_TENANT_ROLES,
  partyRoles,
  roles,
  menuItemPrices,
  tenantCountries,
  tenants,
} from "./schema";
import * as laSorella from "./seed-data/la-sorella";

// -----
// Dev seed: Sorella Cafe plus one owner who
// can sign in. Safe to run more than once.
// -----
const SORELLA = {
  name: "Sorella Cafe",
  slug: "sorella",
  timezone: "America/New_York",
};
const SORELLA_HOST_ORIGIN = "http://localhost:5174";
const SORELLA_COUNTRY = { country: "US", currency: "USD" };
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@sorella.test";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD;

async function seedTenant() {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, SORELLA.slug));
  if (existing) {
    if (existing.allowedOrigins.length === 0) {
      await db
        .update(tenants)
        .set({ allowedOrigins: [SORELLA_HOST_ORIGIN] })
        .where(eq(tenants.id, existing.id));
    }
    return existing.id;
  }
  const [party] = await db.insert(parties).values({ type: "organization" }).returning();
  await db.insert(organizations).values({ partyId: party.id, name: SORELLA.name });
  const [tenant] = await db
    .insert(tenants)
    .values({ organizationPartyId: party.id, ...SORELLA, allowedOrigins: [SORELLA_HOST_ORIGIN] })
    .returning();
  return tenant.id;
}

// -----
// Sorella's Country: the one the Location sits in
// and the menu is priced in.
// -----
async function seedCountry(tenantId: string) {
  const [existing] = await db
    .select()
    .from(tenantCountries)
    .where(and(eq(tenantCountries.tenantId, tenantId), eq(tenantCountries.country, SORELLA_COUNTRY.country)));
  if (existing) return existing.id;
  const [created] = await db.insert(tenantCountries).values({ tenantId, ...SORELLA_COUNTRY }).returning();
  return created.id;
}

// -----
// A Person, their login, and a credential
// hashed the way better-auth checks it.
// -----
async function seedOwner(password: string) {
  const [existing] = await db.select().from(authUser).where(eq(authUser.email, OWNER_EMAIL));
  if (existing) return existing.partyId;
  const [party] = await db.insert(parties).values({ type: "person" }).returning();
  await db.insert(persons).values({ partyId: party.id, firstName: "Example", lastName: "Owner" });
  const userId = crypto.randomUUID();
  await db.insert(authUser).values({
    id: userId,
    name: "Example Owner",
    email: OWNER_EMAIL,
    emailVerified: true,
    partyId: party.id,
  });
  await db.insert(authAccount).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(password),
  });
  return party.id;
}

// -----
// La Sorella's menu as Sorella's knowledge;
// skipped once the Tenant has a menu.
// -----
async function seedKnowledge(tenantId: string, countryId: string) {
  const [hasMenu] = await db.select().from(tenantMenuCategories).where(eq(tenantMenuCategories.tenantId, tenantId)).limit(1);
  if (hasMenu) return;
  const { phone, address, ...profile } = laSorella.businessProfile;
  const [existingLocation] = await db.select().from(tenantLocations).where(eq(tenantLocations.tenantId, tenantId)).limit(1);
  const location =
    existingLocation ??
    (
      await db
        .insert(tenantLocations)
        .values({ tenantId, countryId, name: SORELLA.name, slug: SORELLA.slug, timezone: SORELLA.timezone, address, phone })
        .returning()
    )[0];
  await db.insert(tenantBusinessProfiles).values({ tenantId, ...profile });
  await db.insert(tenantBusinessHours).values(laSorella.businessHours.map((h) => ({ tenantId, locationId: location.id, ...h })));
  await db
    .insert(tenantBusinessHoursOverrides)
    .values(laSorella.hoursOverrides.map((o) => ({ tenantId, locationId: location.id, ...o })));
  const faqCategories = await db
    .insert(tenantFaqCategories)
    .values(laSorella.faqCategories.map((name, i) => ({ tenantId, name, sortOrder: i })))
    .returning();
  const faqCategoryId = new Map(faqCategories.map((c) => [c.name, c.id]));
  await db.insert(tenantFaqs).values(
    laSorella.faqs.map(({ category, ...f }) => ({ tenantId, categoryId: faqCategoryId.get(category), ...f })),
  );
  const categories = await db
    .insert(tenantMenuCategories)
    .values(laSorella.categories.map((c, i) => ({ tenantId, name: c.name, note: c.note, sortOrder: i })))
    .returning();
  const categoryId = new Map(categories.map((c) => [c.name, c.id]));
  const items = await db
    .insert(tenantMenuItems)
    .values(
      laSorella.menuItems.map((m, i) => ({
        tenantId,
        categoryId: categoryId.get(m.category)!,
        name: m.name,
        description: m.description,
        isAvailable: m.isAvailable,
        sortOrder: i,
      })),
    )
    .returning();
  await db.insert(menuItemPrices).values(
    laSorella.menuItems.map((m, i) => ({
      tenantId,
      menuItemId: items[i].id,
      countryId,
      price: m.price,
      variants: m.variants,
    })),
  );
  const slugs = [...new Set(laSorella.menuItems.flatMap((m) => m.dietaryTags))];
  const tags = await db.select().from(dietaryTags).where(inArray(dietaryTags.slug, slugs));
  const tagId = new Map(tags.map((t) => [t.slug, t.id]));
  const links = laSorella.menuItems.flatMap((m, i) =>
    m.dietaryTags.map((slug) => ({ tenantId, menuItemId: items[i].id, dietaryTagId: tagId.get(slug)! })),
  );
  if (links.length) await db.insert(tenantMenuItemDietaryTags).values(links);
}

async function main() {
  if (!OWNER_PASSWORD) throw new Error("Set SEED_OWNER_PASSWORD to seed the Sorella owner");
  const tenantId = await seedTenant();
  const partyId = await seedOwner(OWNER_PASSWORD);
  await db
    .insert(roles)
    .values(DEFAULT_TENANT_ROLES.map((role) => ({ tenantId, ...role })))
    .onConflictDoNothing();
  const [ownerRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.key, "owner")));
  await db
    .insert(partyRoles)
    .values({ partyId, tenantId, roleId: ownerRole.id, roleKey: ownerRole.key })
    .onConflictDoNothing();
  await seedKnowledge(tenantId, await seedCountry(tenantId));
  console.log(`seeded ${SORELLA.slug} with owner ${OWNER_EMAIL} and La Sorella's knowledge`);
}

main();
