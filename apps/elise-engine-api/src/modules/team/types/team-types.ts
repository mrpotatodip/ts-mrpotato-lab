import type { Conflict, DbError, Forbidden, Invalid, NotFound } from "#/lib/effect-query";
import type { TeamInviteEmail } from "#/modules/email";

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

export type InviteMailer = {
  dashboardUrl: string;
  enqueue: (mail: TeamInviteEmail) => Promise<void>;
};

export type AcceptInvite = {
  tokenHash: string;
  now: Date;
  signedInUserId: string | undefined;
  newLogin: { firstName: string; lastName: string; passwordHash: string } | undefined;
};
