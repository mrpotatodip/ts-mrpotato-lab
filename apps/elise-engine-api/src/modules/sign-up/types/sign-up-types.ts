// -----
// What the insert needs: the validated body
// with the password already hashed, the slug
// picked and the invite code reduced to its hash.
// -----
export type NewAccount = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  accountName: string;
  timezone: string;
  slug: string;
  inviteCodeHash: string;
  now: Date;
};
