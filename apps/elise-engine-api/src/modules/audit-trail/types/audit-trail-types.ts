import type { PoolDbType } from "#/lib/db-connection";

// -----
// What a write needs: a transaction or the pool.
// -----
export type AuditDb = Pick<PoolDbType, "insert">;

export type AuditAction =
  | "team.invite.created"
  | "team.invite.revoked"
  | "team.invite.accepted"
  | "group.created"
  | "group.renamed"
  | "group.deleted"
  | "group.member.added"
  | "group.member.removed"
  | "finding.triage.set"
  | "finding.risk.accepted"
  | "github.install.connected"
  | "github.install.removed";

// -----
// The facts an audit row may carry about the
// change. Never a token, hash or password.
// -----
export type AuditDetails = {
  name?: string;
  email?: string;
  role?: string;
  partyId?: string;
  groupIds?: string[];
  reason?: "replaced" | "revoked";
  fingerprint?: string;
  status?: string;
  note?: string | null;
  acceptedUntil?: string | null;
  installationId?: number;
  accountLogin?: string;
  repositorySelection?: string;
  noticeAcceptedAt?: string;
  reconnected?: boolean;
};

// -----
// subjectId is the row that changed. The Tenant
// goes into `after`, because the table has no
// tenant column.
// -----
export type AuditEntry = {
  actorPartyId: string | null;
  action: AuditAction;
  subjectId: string;
  tenantId: string;
  before?: AuditDetails;
  after?: AuditDetails;
};
