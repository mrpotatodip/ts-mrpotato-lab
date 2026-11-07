import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./client";
import { authAccount, authUser, partyMasterTypes, partyOrganizations, parties, partyRoles, partyPersons, tenants } from "./schema";
import { ensureTenantRoles, findTenantRole } from "./tenant-roles";

// -----
// Dev seed: one demo account plus one tenant_admin
// who can sign in. Safe to run more than once.
// -----
const DEMO = {
  name: "Elise Demo",
  slug: "demo",
  timezone: "UTC",
};
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@elise.test";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD;

async function findPartyTypeId(key: string) {
  const [row] = await db.select({ id: partyMasterTypes.id }).from(partyMasterTypes).where(eq(partyMasterTypes.key, key));
  if (!row) throw new Error(`Party type ${key} is missing; run the migrations`);
  return row.id;
}

async function seedTenant() {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, DEMO.slug));
  if (existing) return existing.id;
  const [party] = await db.insert(parties).values({ masterTypeId: await findPartyTypeId("organization") }).returning();
  await db.insert(partyOrganizations).values({ partyId: party.id, name: DEMO.name });
  const [tenant] = await db
    .insert(tenants)
    .values({ partyId: party.id, ...DEMO })
    .returning();
  return tenant.id;
}

// -----
// A Person, their login, and a credential
// hashed the way better-auth checks it.
// -----
async function seedOwner(password: string) {
  const [existing] = await db.select().from(authUser).where(eq(authUser.email, OWNER_EMAIL));
  if (existing) return existing.partyId;
  const [party] = await db.insert(parties).values({ masterTypeId: await findPartyTypeId("person") }).returning();
  await db.insert(partyPersons).values({ partyId: party.id, firstName: "Example", lastName: "Owner" });
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

async function main() {
  if (!OWNER_PASSWORD) throw new Error("Set SEED_OWNER_PASSWORD to seed the demo tenant_admin");
  const tenantId = await seedTenant();
  const partyId = await seedOwner(OWNER_PASSWORD);
  await ensureTenantRoles(db, tenantId);
  const ownerRole = await findTenantRole(db, tenantId, "tenant_admin");
  if (!ownerRole) throw new Error("tenant_admin role missing after ensureTenantRoles");
  await db
    .insert(partyRoles)
    .values({ partyId, tenantId, roleId: ownerRole.id, roleScope: ownerRole.scope })
    .onConflictDoNothing();
  console.log(`seeded ${DEMO.slug} with tenant_admin ${OWNER_EMAIL}`);
}

main();
