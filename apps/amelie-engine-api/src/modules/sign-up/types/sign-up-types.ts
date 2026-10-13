import type { TenantRegion } from "@repo/contracts/amelie";

// -----
// What the insert needs: the validated body
// with the password already hashed, the slug
// picked, the website cut down to its origin and
// the invite code reduced to its hash.
// -----
export type NewAccount = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  cafeName: string;
  timezone: string;
  country: TenantRegion["country"];
  currency: TenantRegion["currency"];
  slug: string;
  allowedOrigins: string[];
  inviteCodeHash: string;
  now: Date;
};
