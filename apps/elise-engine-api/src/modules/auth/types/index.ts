import type { InviteEmail } from "#/modules/team/types";

// -----
// One password reset email, as it waits in the
// queue. The link holds the one-time token. `kind`
// tells it from an invite, which has no such field.
// -----
export type PasswordResetEmail = {
  kind: "password-reset";
  to: string;
  link: string;
  expiresAt: string;
};

// -----
// What the email queue carries: an invite, or a
// reset. The queue keeps its first name; messages
// already in it are invites.
// -----
export type QueuedEmail = InviteEmail | PasswordResetEmail;
