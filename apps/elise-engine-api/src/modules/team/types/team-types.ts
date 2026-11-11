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

// -----
// One invite email, as it waits in the queue.
// The link holds the one-time token.
// -----
export type InviteEmail = {
  to: string;
  accountName: string;
  inviterName: string;
  roleLabel: string;
  link: string;
  expiresAt: string;
};

export type InviteMailer = {
  dashboardUrl: string;
  enqueue: (mail: InviteEmail) => Promise<void>;
};

export type AcceptInvite = {
  tokenHash: string;
  now: Date;
  signedInUserId: string | undefined;
  newLogin: { firstName: string; lastName: string; passwordHash: string } | undefined;
};
