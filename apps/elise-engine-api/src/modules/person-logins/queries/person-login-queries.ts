import { eq } from "drizzle-orm";
import { authAccount, authUser, parties, partyMasterTypes, partyPersons } from "@repo/db-elise";
import type { NewPersonLogin, PersonLogin, PersonLoginDb } from "#/modules/person-logins/types";

// -----
// A Person, the Login that belongs to it and its
// email-and-password credential. Run it inside the
// transaction that also gives the Person a Role, so
// a Login never exists without one. A taken email
// is a unique violation for the caller to map.
// -----
export const createPersonLogin = (db: PersonLoginDb, person: NewPersonLogin): Promise<PersonLogin> =>
  db
    .select({ id: partyMasterTypes.id })
    .from(partyMasterTypes)
    .where(eq(partyMasterTypes.key, "person"))
    .then(([personType]) => {
      if (!personType) throw new Error("party type person is missing; run the migrations");
      return db.insert(parties).values({ masterTypeId: personType.id }).returning();
    })
    .then(([party]) =>
      db
        .insert(partyPersons)
        .values({ partyId: party.id, firstName: person.firstName, lastName: person.lastName })
        .then(() => party.id),
    )
    .then((partyId) => {
      const userId = crypto.randomUUID();
      return db
        .insert(authUser)
        .values({ id: userId, name: `${person.firstName} ${person.lastName}`, email: person.email, emailVerified: false, partyId })
        .then(() => db.insert(authAccount).values({ id: crypto.randomUUID(), accountId: userId, providerId: "credential", userId, password: person.passwordHash }))
        .then(() => ({ userId, partyId }));
    });
