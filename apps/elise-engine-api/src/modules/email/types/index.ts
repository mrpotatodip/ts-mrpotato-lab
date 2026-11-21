// -----
// One Team invite email, as it waits in the queue.
// The link holds the one-time token, because only the
// hash of the token is stored.
// -----
export type TeamInviteEmail = {
  kind: "team-invite";
  inviteId?: string;
  to: string;
  accountName: string;
  inviterName: string;
  roleLabel: string;
  link: string;
  expiresAt: string;
};

// -----
// One password reset email. The link holds the
// one-time token.
// -----
export type PasswordResetEmail = {
  kind: "password-reset";
  to: string;
  link: string;
  expiresAt: string;
};

// -----
// Security notice: the Account's Anthropic key was set or
// removed. It never holds any part of the key.
// -----
export type AnthropicKeyChangedEmail = {
  kind: "anthropic-key-changed";
  to: string;
  change: "set" | "removed";
  accountName: string;
  actorName: string;
  changedAt: string;
  link: string;
};

// -----
// Security notice: the password was changed through a
// reset. It names no one; the link opens the
// forgot-password page.
// -----
export type PasswordResetDoneEmail = {
  kind: "password-reset-done";
  to: string;
  changedAt: string;
  link: string;
};

// -----
// Security notice: the Account's Monthly budget changed,
// from one effective value to another.
// -----
export type BudgetChangedEmail = {
  kind: "budget-changed";
  to: string;
  accountName: string;
  actorName: string;
  changedAt: string;
  previousBudgetUsd: number;
  budgetUsd: number;
  link: string;
};

// -----
// A Security notice about a Runner. It carries IDs: the
// consumer loads the Runner's name and the actor at send
// time. `at` is when the change committed.
// -----
export type RunnerNoticeEmail = {
  kind: "runner-added" | "runner-removed";
  to: string;
  accountId: string;
  runnerId: string;
  actorUserId: string;
  at: string;
  link: string;
};

export type RunnerNames = { runnerName: string; actorName: string; accountName: string };

// -----
// What the email queue carries: one member for each
// email, told apart by `kind`. A kind with no
// template does not compile (render-email.ts).
// -----
export type QueuedEmail = TeamInviteEmail | PasswordResetEmail | PasswordResetDoneEmail | AnthropicKeyChangedEmail | BudgetChangedEmail | RunnerNoticeEmail;

// -----
// The shape queued before `kind` existed: always a
// Team invite. The consumer still reads it for one
// release.
// -----
export type LegacyInviteEmail = Omit<TeamInviteEmail, "kind">;

export type QueueBody = QueuedEmail | LegacyInviteEmail;

// -----
// How the consumer tells a Team invite whether its email went
// out. A failed write is logged by the caller and never retried.
// -----
export type RecordInviteStatus = (inviteId: string, status: "sent" | "failed") => Promise<void>;

export type RetryRule = "backoff" | "long-wait" | "drop";
