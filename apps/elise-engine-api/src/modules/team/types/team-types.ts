import type { Conflict, DbError, Forbidden, Invalid, NotFound } from "#/lib/effect-query";

// -----
// Failures a team service can end with.
// -----
export type TeamFailure = Conflict | Forbidden | Invalid | NotFound | DbError;

// -----
// Invites
// -----
export type NewInvite = {
  tenantId: string;
  actorUserId: string;
  email: string;
  roleKey: string;
  groupIds: string[];
  tokenHash: string;
  now: Date;
  expiresAt: Date;
};

export type AcceptInvite = {
  tokenHash: string;
  now: Date;
  signedInUserId: string | undefined;
  newLogin: { firstName: string; lastName: string; passwordHash: string } | undefined;
};
