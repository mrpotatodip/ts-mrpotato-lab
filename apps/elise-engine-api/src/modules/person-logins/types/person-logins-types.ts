import type { PoolDbType } from "#/lib/db-connection";

export type PersonLoginDb = Pick<PoolDbType, "select" | "insert">;

export type NewPersonLogin = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
};

export type PersonLogin = { userId: string; partyId: string };
